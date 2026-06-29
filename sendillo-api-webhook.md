API Documentation
API Docs

Servers

https://www.sendillo.com
Filter by tag
Messaging
Send SMS/MMS using your purchased Sendillo numbers.



POST
/api/v1/messages
Send SMS


Parameters
No parameters

Request body

application/json
{
  "from": "+15551234567",
  "to": "+15557654321",
  "body": "Hi! Your appointment is confirmed for Tuesday at 3pm. Reply STOP to opt out."
}
Responses
Code	Description	Links
200	
Accepted for delivery

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
400	
Invalid body or sender not on account

Media type

*/*
Example Value
Schema
{}
No links
502	
Downstream send failed

Media type

*/*
Example Value
Schema
{}
No links

POST
/api/v1/messages/mms
Send MMS


Parameters
No parameters

Request body

application/json
{
  "from": "+15551234567",
  "to": "+15557654321",
  "body": "Thanks for your purchase — see attached receipt.",
  "mediaUrls": [
    "https://cdn.example.com/receipts/8821.png"
  ]
}
Responses
Code	Description	Links
200	
Accepted for delivery

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
400	
Invalid body or sender not on account

Media type

*/*
Example Value
Schema
{}
No links
502	
Downstream send failed

Media type

*/*
Example Value
Schema
{}
No links

POST
/api/v1/messages/mms/bulk
Send Bulk MMS


Parameters
No parameters

Request body

application/json
{
  "messages": [
    {
      "from": "+15551234567",
      "to": "+15557654321",
      "body": "Your flyer",
      "mediaUrls": [
        "https://cdn.example.com/flyer.jpg"
      ],
      "clientRef": "mms-1"
    }
  ]
}
Responses
Code	Description	Links
200	
Batch processed; inspect per-row results

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
400	
Invalid body, batch size, or sender not on account

Media type

*/*
Example Value
Schema
{}
No links
502	
Bulk enqueue failed

Media type

*/*
Example Value
Schema
{}
No links

POST
/api/v1/messages/bulk
Send Bulk SMS


Parameters
No parameters

Request body

application/json
{
  "messages": [
    {
      "from": "+15551234567",
      "to": "+15557654321",
      "body": "Reminder: appointment Tuesday 3pm. Reply STOP to opt out.",
      "clientRef": "row-1"
    }
  ]
}
Responses
Code	Description	Links
200	
Batch processed; inspect per-row results

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
400	
Invalid body, batch size, or sender not on account

Media type

*/*
Example Value
Schema
{}
No links
502	
Bulk enqueue failed

Media type

*/*
Example Value
Schema
{}
No links
Brands
Read-only view of brands on your company account.



GET
/api/v1/brands
List brands


Parameters
No parameters

Responses
Code	Description	Links
200	
OK

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
Numbers
Numbers purchased on your company account.



GET
/api/v1/numbers/purchased
List purchased numbers


Parameters
No parameters

Responses
Code	Description	Links
200	
OK

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links
Campaigns
Read-only view of 10DLC campaigns on your company account.



GET
/api/v1/campaigns
List campaigns


Parameters
No parameters

Responses
Code	Description	Links
200	
OK

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links

GET
/api/v1/campaigns/{id}
Get campaign by id


Parameters
Name	Description
id *
integer($int64)
(path)
id
Responses
Code	Description	Links
200	
OK

Media type

*/*
Controls Accept header.
Example Value
Schema
{}
No links







Webhooks

it asks to (enter you url to receive webhook at) and we need to save that in the webhook dashboard so thats it.

Inbound message received
inbound.received
Enabled
HTTPS URL (enter you url to receive webhook at)

Outbound message delivered
message.delivered
Enabled
HTTPS URL (enter you url to receive webhook at)

Outbound message failed
message.failed
Enabled
HTTPS URL (enter you url to receive webhook at)

Outbound message accepted for sending
message.sent
Enabled
HTTPS URL (enter you url to receive webhook at)

Save


© 2026 Sendillo