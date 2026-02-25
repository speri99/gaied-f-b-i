import boto3
import time
from botocore.exceptions import ClientError

PREFIX = "GEO"
REGION = "us-west-2"  # change as needed

# Optional: use named profiles
src_session = boto3.Session(profile_name="source-profile", region_name=REGION)
dst_session = boto3.Session(profile_name="dest-profile", region_name=REGION)

src_ddb = src_session.client("dynamodb")
dst_ddb = dst_session.client("dynamodb")
src_ddb_resource = src_session.resource("dynamodb")
dst_ddb_resource = dst_session.resource("dynamodb")

def table_exists_in_dest(table_name):
    try:
        dst_ddb.describe_table(TableName=table_name)
        return True
    except dst_ddb.exceptions.ResourceNotFoundException:
        return False


def get_matching_tables():
    table_names = []
    paginator = src_ddb.get_paginator('list_tables')
    for page in paginator.paginate():
        for name in page['TableNames']:
            if name.startswith(PREFIX):
                table_names.append(name)
    return table_names

def get_table_definition(table_name):
    try:
        response = src_ddb.describe_table(TableName=table_name)
        return response.get('Table')
    except ClientError as e:
        print(f"[ERROR] Could not describe table {table_name}: {e}")
        return None

def create_table_in_dest(table_def):
    src_table = table_def['Table']
    name = src_table['TableName']
    key_schema = src_table['KeySchema']
    attr_definitions = src_table['AttributeDefinitions']
    provisioned = src_table.get('ProvisionedThroughput')

    # Handle billing mode
    billing_mode = src_table.get('BillingModeSummary', {}).get('BillingMode', 'PROVISIONED')

    params = {
        'TableName': name,
        'KeySchema': key_schema,
        'AttributeDefinitions': attr_definitions,
        'BillingMode': billing_mode
    }

    if billing_mode == 'PROVISIONED':
        params['ProvisionedThroughput'] = {
            'ReadCapacityUnits': provisioned['ReadCapacityUnits'],
            'WriteCapacityUnits': provisioned['WriteCapacityUnits']
        }

    # Add GSIs if present
    if 'GlobalSecondaryIndexes' in src_table:
        params['GlobalSecondaryIndexes'] = []
        for gsi in src_table['GlobalSecondaryIndexes']:
            gsi_def = {
                'IndexName': gsi['IndexName'],
                'KeySchema': gsi['KeySchema'],
                'Projection': gsi['Projection']
            }
            if billing_mode == 'PROVISIONED':
                provisioned = gsi['ProvisionedThroughput']
                gsi_def['ProvisionedThroughput'] = {
                    'ReadCapacityUnits': provisioned['ReadCapacityUnits'],
                    'WriteCapacityUnits': provisioned['WriteCapacityUnits']
                }

            params['GlobalSecondaryIndexes'].append(gsi_def)


    print(f"Creating table: {name}")
    dst_ddb.create_table(**params)
    # Wait for table creation
    waiter = dst_ddb.get_waiter('table_exists')
    waiter.wait(TableName=name)
    print(f"Table {name} created in destination.")

def copy_data(source_table_name):
    print(f"Copying data from {source_table_name}...")
    source_table = src_ddb_resource.Table(source_table_name)
    dest_table = dst_ddb_resource.Table(source_table_name)

    scan_kwargs = {}
    while True:
        response = source_table.scan(**scan_kwargs)
        items = response.get("Items", [])

        with dest_table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)

        if "LastEvaluatedKey" not in response:
            break
        scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
    print(f"Data copied for table: {source_table_name}")

def migrate_tables():
    matching_tables = get_matching_tables()
    print(f"Found {len(matching_tables)} matching tables with prefix '{PREFIX}'")

    for table in matching_tables:
        if table_exists_in_dest(table):
            print(f"[SKIP] Table {table} already exists in destination. Skipping.")
            continue
        table_def = get_table_definition(table)
        if not table_def:
            print(f"[SKIP] Skipping table {table} due to error.")
            continue
        create_table_in_dest({'Table': table_def})
        copy_data(table)



if __name__ == "__main__":
    migrate_tables()
