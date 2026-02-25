import { PinpointClient, SendMessagesCommand } from "@aws-sdk/client-pinpoint";

const pinpoint = new PinpointClient({});

export const handler = async (event) => {
  const phoneNumber = event["Details"]["Parameters"]["PhoneNumber"];
  const message = `Please click to learn more: https://dzqsr4lop0r3.cloudfront.net/?type=404&id=${event["Details"]["Parameters"]["id"]}`;

  await pinpoint.send(
    new SendMessagesCommand({
      ApplicationId: process.env.PINPOINT_APP_ID,
      MessageRequest: {
        Addresses: {
          [phoneNumber]: { ChannelType: "SMS" },
        },
        MessageConfiguration: {
          SMSMessage: {
            Body: message,
            MessageType: "TRANSACTIONAL",
          },
        },
      },
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "SMS sent successfully" }),
  };
};
