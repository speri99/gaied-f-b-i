import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

// Create a DynamoDB client
const ddbClient = new DynamoDBClient({});

export const handler = async (event) => {
  const shortCode = event.pathParameters.shortCode;
  console.log(`Looking up short code: ${shortCode}`);

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const shortCodeTable = process.env.SHORTCODE_TABLE;
  const websiteTemplatesTable = process.env.TEMPLATE_TABLE;

  try {
    // Lookup short code mapping
    const mappingResult = await ddbClient.send(new GetCommand({
      TableName: shortCodeTable,
      Key: { code: shortCode }
    }));

    if (!mappingResult.Item) {
      return { statusCode: 404, body: "Short code not found" };
    }

    const mapping = mappingResult.Item;
    const tenantId = mapping.tenantId;
    const templateId = mapping.websiteTemplateId;
    const identifier = mapping.identifier || "13032495156";

    // Get template
    const templateResult = await ddbClient.send(new GetCommand({
      TableName: websiteTemplatesTable,
      Key: { tenantId, id: templateId }
    }));

    if (!templateResult.Item) {
      return { statusCode: 404, body: "Template not found" };
    }

    const originalHtml = templateResult.Item.html || "";

    // Script to inject into template
    const locationScript = `
<script>
  (function(){
    console.log("[Location] Script injected.");

    async function getLocationAndSend() {
      if (!navigator.geolocation) {
        console.warn("[Location] Geolocation not supported.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async function(posData) {
          console.log("[Location] Got position:", posData.coords);
          const { latitude, longitude } = posData.coords;

          try {
            const geocodeUrl = \`https://maps.googleapis.com/maps/api/geocode/json?latlng=\${latitude},\${longitude}&key=${googleMapsApiKey}\`;
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            const address = data.results[0];

            const components = address.address_components.reduce((acc, comp) => {
              if (comp.types.includes("street_number")) acc.streetNumber = comp.long_name;
              if (comp.types.includes("route")) acc.route = comp.long_name;
              if (comp.types.includes("locality")) acc.city = comp.long_name;
              if (comp.types.includes("administrative_area_level_1")) acc.state = comp.short_name;
              if (comp.types.includes("country")) acc.country = comp.long_name;
              if (comp.types.includes("postal_code")) acc.postalCode = comp.long_name;
              return acc;
            }, {});

            const streetAddress = [components.streetNumber, components.route].filter(Boolean).join(" ");

            const payload = {
              identifier: "${identifier}",
              latitude,
              longitude,
              formattedAddress: address.formatted_address,
              streetAddress,
              city: components.city || "",
              state: components.state || "",
              country: components.country || "",
              postalCode: components.postalCode || "",
              dispatched: false
            };

            console.log("[Location] Sending payload to API:", payload);

            const apiResponse = await fetch("https://qz8evsbmc5.execute-api.us-west-2.amazonaws.com/prod/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            const result = await apiResponse.text();
            console.log("[Location] API response:", result);
          } catch (err) {
            console.error("[Location] Failed to reverse geocode or send data:", err);
          }
        },
        function(err) {
          console.error("[Location] Geolocation error:", err.message);
        }
      );
    }

    document.addEventListener("DOMContentLoaded", getLocationAndSend);
  })();
</script>
`;

    // Inject script before </body> or append at end
    let finalHtml = originalHtml;
    if (finalHtml.includes("</body>")) {
      finalHtml = finalHtml.replace("</body>", `${locationScript}</body>`);
    } else {
      finalHtml += locationScript;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: finalHtml
    };

  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
