# Introduction

**Thanks for choosing the Loop Message product!**

Here you can find detailed documentation describing how to integrate this API into your website or backend server. Non-API related answers can be found in the [Helpdesk](https://loopmessage.com/helpdesk).

If you will have issues with integration or can't find answers in the API doc or Helpdesk, please feel free to contact support.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/readme.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Credentials

In order to use the API, you will need to use the credentials, which you can find in your account dashboard.

### Using Credentials

With each request to the API, make sure to include the `Organization API Key` in the headers of the request. The server expects the [Authorization header](https://developer.mozilla.org/docs/Web/HTTP/Headers/Authorization) relating to auth:

* **`Authorization`**: This is your API Key

{% hint style="info" %}
There is no need to pass **Bearer** or **Basic** in the Authorization header.
{% endhint %}

### Best Practices

It is generally best practice not to expose your API keys by using them from the frontend, and we highly recommend keeping your API Key in a safe place without any access for common users.

### Supported protocols and ports

We only support HTTP**S** requests to our API with a minimum `TLS v.1.2`.\
`SMPP` protocol or `HTTP` requests without `SSL` are **NOT** supported.

Supported ports for HTTP**S** requests:

* 443
* 2053
* 2083
* 2087
* 2096
* 8443

{% hint style="warning" %}
Requests to any other ports or with `TLS v.1.1` and fewer may fail
{% endhint %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/credentials.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Webhooks/Callbacks

Through webhooks, you can receive notifications when an event is fired. In most cases, it is a good idea to start processing `inbound` messages and then process the statuses of `outbound` messages.

## Registering and processing webhooks

{% hint style="info" %}
For each organization, you can specify separate webhook URLs and headers for events.
{% endhint %}

Our server will send `POST` requests to your server, in which the body will be a `JSON` representation of the notification. Your server should return a **200 status code**. Any other status code will be considered a failure by our backend. Our server will retry later (up to 30 times) with an increasing delay. First 10 retries every 30 seconds, the next 10 retries every 3 mins, and the last 10 retries every 15 mins. After 30 retries, we will stop sending notifications.

If your service/app doesn't return a response within `15 seconds`, our server will disconnect and reschedule a webhook for retry. **It's highly recommended that your apps/services defer processing until return a response with a status code 200.**

## Webhook Events

### Sample Webhook Events

These are some representative samples of webhooks you might receive from LoopMessage. Keep in mind that webhooks can include additional fields to what's shown here.

{% tabs %}
{% tab title="Inbound" %}

```javascript
{
    "event": "message_inbound",
    "contact": "+13231112233",
    "text": "text",
    "message_type": "text",
    "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
    "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
    "api_version": "1.0"
}
```

{% endtab %}

{% tab title="Scheduled" %}

```javascript
{
    "event": "message_scheduled",
    "contact": "+13231112233",
    "text": "text",
    "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
    "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
    "api_version": "1.0"
}
```

{% endtab %}

{% tab title="Failed" %}

```javascript
{
    "event": "message_failed",
    "contact": "+13231112233",
    "text": "text",
    "error_code": 100,
    "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
    "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
    "api_version": "1.0"
}
```

{% endtab %}

{% tab title="Delivered" %}

```javascript
{
    "event": "message_delivered",
    "contact": "+13231112233",
    "text": "text",
    "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
    "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
    "api_version": "1.0"
}
```

{% endtab %}

{% tab title="Reaction" %}

```json
{
    "event": "message_reaction",
    "contact": "+13231112233",
    "text": "text",
    "reaction": "like",
    "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
    "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
    "api_version": "1.0"
}
```

{% endtab %}
{% endtabs %}

### Possible JSON fields in webhooks

<table><thead><tr><th width="159">Field</th><th width="118">Type</th><th width="450.1684011352885">Description</th></tr></thead><tbody><tr><td>message_id</td><td>String</td><td>Unique identifier of your request/message.</td></tr><tr><td>webhook_id</td><td>String</td><td>Unique identifier of the event.</td></tr><tr><td>event</td><td>String</td><td>Check the <a href="#event-types">Event Types</a> section for possible values.</td></tr><tr><td>contact</td><td>String</td><td>The contact to which the event relates. Contact can be a phone number or email address. A phone number will be in the E164 format: <code>+13231112233</code>, without spaces and brackets. Email will be in lowercase format.</td></tr><tr><td>text</td><td>String</td><td>Text in the message.</td></tr><tr><td>subject</td><td>String</td><td>Optional Field. Message subject.</td></tr><tr><td>attachments</td><td>Array</td><td>Optional Field with an array of strings. This field will only be for the event: <code>message_inbound</code>. Each element of the array is the URL to download the file.</td></tr><tr><td>message_type</td><td>String</td><td>This field will only be for events: <code>message_inbound</code> or <code>message_reaction</code>.<br>Possible values: <code>text</code>, <code>reaction</code>, <code>audio</code>, <code>attachments</code>, <code>sticker</code>, <code>location</code>.</td></tr><tr><td>channel</td><td>String</td><td>How the message was sent/received. Possible values: <code>imessage</code>, <code>sms</code>, <code>rcs</code>.</td></tr><tr><td>reaction</td><td>String</td><td><p>Indicates if a contact reacted to your message.</p><p>This field will only be for the event: <code>message_reaction</code>.</p><p>Possible values: <code>love</code>, <code>like</code>, <code>dislike</code>, <code>laugh</code>, <code>emphasize</code>, <code>question</code>, <code>unknown</code>.</p></td></tr><tr><td>sender</td><td>String</td><td>Dedicated sender name ID.</td></tr><tr><td>thread_id</td><td>String</td><td>Optional field. If the contact tapped reply-to it will create a conversation thread in the iMessage. This identifier will help you understand to which thread the message is related.</td></tr><tr><td>error_code</td><td>Integer</td><td><p>Error code that occurred while processing the request.</p><p>This field will only be for the event: <code>message_failed</code>.</p></td></tr><tr><td>language</td><td>Object</td><td>The dominant language that is used in the text. Check the <a href="#language">language section</a> for details.</td></tr><tr><td>group</td><td>Object</td><td>Data related to the iMessage group. Check the <a href="#group">group section</a> for details.</td></tr><tr><td>speech</td><td>Object</td><td>Optional field. Transcription of an inbound audio message. Will be contained in the JSON only if the speech recognition was done successfully. Check the <a href="#group">speech section</a> for details.</td></tr></tbody></table>

### Event Types

{% hint style="info" %}
All values will be in lowercase and in snake\_case format
{% endhint %}

<table><thead><tr><th width="212.29250014646743">Event type</th><th width="490.99572483482325">Description</th></tr></thead><tbody><tr><td>opt-in</td><td>Your contact first time sent an inbound message to your sender name.</td></tr><tr><td>message_failed</td><td>Failed to send or deliver a message. Further events related to your request will no longer be fired.</td></tr><tr><td>message_delivered</td><td>The message has been delivered.</td></tr><tr><td>message_inbound</td><td>Contact sent you an inbound message.</td></tr><tr><td>message_reaction</td><td>Contact put a reaction to your text. For example Like, Love and etc.</td></tr><tr><td>inbound_call</td><td>Your contact attempted to call via FaceTime.</td></tr><tr><td>unknown</td><td>An unknown event has occurred</td></tr></tbody></table>

### Language

<table><thead><tr><th width="170">Key</th><th>Value</th></tr></thead><tbody><tr><td>code</td><td><a href="https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes">ISO 639-1</a> code. Examples: <code>en</code>, <code>fr</code>, <code>de</code>, <code>ja</code>, <code>zh</code>.</td></tr><tr><td>name</td><td>Examples: <code>English</code>, <code>French</code>, <code>German</code>, <code>Japanese</code>, <code>Chinese</code>.</td></tr><tr><td>script</td><td><p>Optional field. Supported only two values for the Chinese language:</p><p>-<code>Hans</code>: <a href="https://en.wikipedia.org/wiki/Simplified_Chinese_characters">Simplified Chinese script</a></p><p>-<code>Hant</code>: <a href="https://en.wikipedia.org/wiki/Traditional_Chinese_characters">Traditional Chinese script</a></p></td></tr></tbody></table>

The dominant language in the text. These values are approximate and may be incorrect if the message is less than 100 characters long or contains text in several languages.

### Group

<table><thead><tr><th width="168">Key</th><th>Value</th></tr></thead><tbody><tr><td>id</td><td>Unique ID of iMessage group. You can use this value as the contact/recipient value in the send messages requests.</td></tr><tr><td>name</td><td>Optional field. Custom name for this group (if named).</td></tr><tr><td>participants</td><td>An array of strings (participants) in this group. Values in the array can be a phone number (in E164 format) or email (in lowercase format).</td></tr></tbody></table>

### Speech

<table><thead><tr><th width="168">Key</th><th>Value</th></tr></thead><tbody><tr><td>text</td><td>Text transcription from audio message</td></tr><tr><td>language</td><td>Language object. The dominant language that is used in the text. Check the <a href="#language">language section</a> for details.</td></tr><tr><td>metadata</td><td>Optional field. The metadata of speech in the audio message. Check the <a href="#speech-metadata">speech metadata section</a> for details.</td></tr></tbody></table>

These values are approximate and may be incorrect if the voice is too long, unclear, or in several languages.

#### Speech metadata

{% hint style="info" %}
Any field in this object can be optional. All values are float type.
{% endhint %}

<table><thead><tr><th width="236">Key</th><th>Value</th></tr></thead><tbody><tr><td>speaking_rate</td><td>Measures the number of words spoken per minute.</td></tr><tr><td>average_pause_duration</td><td>Measures average pause between words (in seconds).</td></tr><tr><td>speech_start_timestamp</td><td>Timestamp of start of speech in audio.</td></tr><tr><td>speech_duration</td><td>Duration of speech in audio.</td></tr><tr><td>jitter</td><td>Jitter measures vocal stability and is measured as an absolute difference between consecutive periods, divided by the average period. It is expressed as a percentage.</td></tr><tr><td>shimmer</td><td>Shimmer measures vocal stability and is measured in decibels.</td></tr><tr><td>pitch</td><td>Pitch measures the highness and lowness of tone and is measured in logarithm of normalized pitch estimates.</td></tr><tr><td>voicing</td><td>Voicing measures the probability of whether a frame is voiced or not and is measured as a probability.</td></tr></tbody></table>

### Headers

These headers will be included in any webhook POST request.

<table><thead><tr><th width="342">Key</th><th width="405.01476014760146">Value</th></tr></thead><tbody><tr><td><strong>Content-Type</strong></td><td>application/json</td></tr><tr><td><strong>User-Agent</strong></td><td>LoopMessage</td></tr><tr><td><strong>Connection</strong></td><td>close</td></tr></tbody></table>

## Best practices

### Authorization

You can configure the authorization header used for webhook requests via the dashboard. Your server should verify the validity of the authorization header for every event. This will help you make sure that a webhook was sent from our service.

{% hint style="warning" %}
**IP Whitelisting**

The webhook IP range is variable, so we don't recommend hardcoding our server's IP. To authenticate requests, you can add an authorization token to the webhook that you can then verify on your server.
{% endhint %}

### Response Duration

Try to return a response immediately so as not to accidentally reach the timeout duration.

If this happens, you can use webhook\_id as a unique identifier to avoid processing the same event twice. But even in this case, you need to return a response with code 200 to stop firing a webhook.

Please note that if you are using `ngrok` or similar services, the timeout time will be much shorter to prevent abuse by keeping many dummy connections.

### Security and encryption

It is highly recommended to use HTTP**S** URLs for webhooks. If you use HTTP URLs (without SSL), requests to your server will not be encrypted and the contents of your requests/messages may be intercepted. In some cases, webhooks for HTTP URLs (without SSL) may not be delivered.

### **Future-Proofing**

You should be able to handle webhooks that include all important fields to what's shown here, including new event types. We may add new fields or event types in the future without changing the API version. We won't remove fields or events without proper API versioning and deprecation.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/webhooks.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Sending Messages

## **Send a single message to a specific contact**

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/message/send/`

You can use a contact ID or a phone number/email address (depending on what the user provided you with when subscribing).

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Request Body

<table><thead><tr><th width="150">Name</th><th width="84">Type</th><th>Description</th></tr></thead><tbody><tr><td>contact<mark style="color:red;">*</mark></td><td>String</td><td>Phone number, Email, or Contact ID.</td></tr><tr><td>text<mark style="color:red;">*</mark></td><td>String</td><td>Your message text</td></tr><tr><td>subject</td><td>String</td><td>Optional. Your message subject. A recipient will see this subject as a bold title before the text.</td></tr><tr><td>sender</td><td>String</td><td>Optional. ID of your sender name. Send message from a specific sender name.</td></tr><tr><td>attachments</td><td>Array</td><td>Optional. An array of strings. The string must be a full URL of your image. URL should start with <code>https://</code>. <strong>HTTP links (without SSL) are not supported</strong>. This must be a publicly accessible file URL: we will not be able to reach any URLs that are hidden or that require authentication. Max length of each URL: 256 characters, max elements in the array: 5.</td></tr><tr><td>effect</td><td>String</td><td><p>Optional. Add effect to your message. Possible values: <code>slam</code>, <code>loud</code>, <code>gentle</code>, <code>invisibleInk</code>, <code>echo</code>, <code>spotlight</code>, <code>balloons</code>, <code>confetti</code>, <code>love</code>, <code>lasers</code>, <code>fireworks</code>, <code>shootingStar</code>, <code>celebration</code>.</p><p>You can check the <a href="https://support.apple.com/HT206894">Apple guide</a> about <code>expressive messages</code>.</p></td></tr><tr><td>reply_to_id</td><td>String</td><td><p>Optional. The <code>message_id</code> that you got from the webhook.</p><p>You can check the <a href="https://support.apple.com/HT211303">Apple guide</a> about the <code>reply to</code> feature.</p></td></tr><tr><td>passthrough</td><td>String</td><td>Optional. A string of metadata you wish to store with the checkout. Will be sent alongside all webhooks associated with the outbound message. Max length: 1000 characters.</td></tr><tr><td>channel</td><td>String</td><td><p>Optional. You can choose which service to use to deliver the message. By default, the required channel will be determined automatically.</p><p>Possible values: <code>imessage</code>, <code>sms</code> , <code>rcs</code>, or <code>whatsapp</code>. Your sender name must have an active SMS or RCS feature.</p><p>SMS does not support <code>subject</code>, <code>effect</code>, or <code>reply_to_id</code> parameters. <code>attachments</code> in SMS - only support pictures (MMS). Use this parameter only in cases when you need to override the delivery channel for a specific request. DON'T use it as a default parameter for all requests.</p></td></tr><tr><td>contact_file</td><td>Bool</td><td>Optional. Add a vCard (Contact file) as an attachment in your message. Use this parameter only in cases when you need to share a contact file. DON'T use it as a default parameter for all requests.</td></tr></tbody></table>

{% tabs %}
{% tab title="200: OK Request for send received" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "contact": "+13231112233",
    "text": "text"
}
```

Phone number will be converted to the next format `+13231112233`, without spaces and brackets. Email will be converted into a lowercase format.
{% endtab %}

{% tab title="400: Bad Request Request for send failed" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "contact": "+13231112233",
    "text": "text"
}
```

{% endtab %}

{% tab title="402: Payment Required No available request. Need purchase additional requests." %}

```json
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "contact": "+13231112233",
    "text": "text"
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Important**

When you receive a successful response with code 200 from send request, it means that the server accepted your request for send and added it to the queue. **But this does not mean that the message was delivered to the recipient or will be sent.**

To handle message status for this request, need to observe [Webhooks](https://docs.loopmessage.com/imessage-conversation-api/webhooks) or use the [API method](https://docs.loopmessage.com/imessage-conversation-api/statuses) to check the status by message ID, which you received in the JSON response.

We recommend using webhooks to track statuses, as you will receive a callback as soon as an event is fired.
{% endhint %}

{% hint style="info" %}
**Supported phone number formats**

Recipient phone numbers should be only in international formats with a country code. Otherwise will be impossible to verify a phone number.

Plus prefix `+` is optional. Spaces, dashes '`-`', brackets '`(123)`' - also optional.

Valid phone number format examples:

* 13231234567
* +13231111111
* +1 (323) 1111111
* +1 323 123 4567
* 1 (323)-123-4567
  {% endhint %}

## **Send a single message to an iMessage group**

<figure><img src="https://119477745-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2Fgit-blob-4ba60d10e5abab359a16c8ece08e36ddb1ec8f30%2Fgroup_chat.png?alt=media" alt="An example of how group chats look like in iMessage" width="273"><figcaption><p>An example of how group chats look like in iMessage</p></figcaption></figure>

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/message/send/`

#### Headers

| Name                                            | Type   | Description                                         |
| ----------------------------------------------- | ------ | --------------------------------------------------- |
| Authorization<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark> |
| Content-Type<mark style="color:red;">\*</mark>  | String | application/json                                    |

#### Request Body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>group<mark style="color:red;">*</mark></td><td>String</td><td>iMessage group ID. You can only get this ID from the webhook: <code>message_inbound</code>.</td></tr><tr><td>text<mark style="color:red;">*</mark></td><td>String</td><td>Your message text</td></tr><tr><td>subject</td><td>String</td><td>Optional. Your message subject. A recipient will see this subject as a bold title before the text.</td></tr><tr><td>sender</td><td>String</td><td>Optional. ID of your sender name. Send message from a specific sender name.</td></tr><tr><td>attachments</td><td>Array</td><td><p>Optional. An array of strings. The string must be a full URL of your image. URL should start with</p><p><code>https://...</code>, <strong>http links (without SSL) are not supported</strong>. This must be a publicly accessible URL: we will not be able to reach any URLs that are hidden or that require authentication. Max length of each URL: 256 characters, max elements in the array: 5.</p></td></tr><tr><td>effect</td><td>String</td><td><p>Optional. Add effect to your message. Possible values: <code>slam</code>, <code>loud</code>, <code>gentle</code>, <code>invisibleInk</code>, <code>echo</code>, <code>spotlight</code>, <code>balloons</code>, <code>confetti</code>, <code>love</code>, <code>lasers</code>, <code>fireworks</code>, <code>shootingStar</code>, <code>celebration</code>.</p><p>You can check the <a href="https://support.apple.com/HT206894">Apple guide</a> about <code>expressive messages</code>.</p></td></tr><tr><td>reply_to_id</td><td>String</td><td><p>Optional. The <code>message_id</code> that you got from the webhook.</p><p>You can check the <a href="https://support.apple.com/HT211303">Apple guide</a> about the <code>reply to</code> feature.</p></td></tr><tr><td>passthrough</td><td>String</td><td>Optional. A string of metadata you wish to store with the checkout. Will be sent alongside all webhooks associated with the outbound message. Max length: 1000 characters.</td></tr></tbody></table>

{% tabs %}
{% tab title="200: OK Request for send received" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "group": {
        "id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
        "name": "String",  // Optional field
        "participants": ["+13231112233", "+13232223344"]
    },
    "text": "text"
}
```

{% endtab %}

{% tab title="400: Bad Request Request for send failed" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "group": {
        "group_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
        "name": "String",  # Optinal field
        "participants": ["+13231112233", "+13232223344"]
    },
    "text": "text"
}
```

{% endtab %}

{% tab title="402: Payment Required No available request. Need purchase additional requests." %}

```json
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "group": {
        "group_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
        "name": "String",  # Optinal field
        "participants": ["+13231112233", "+13232223344"]
    },
    "text": "text"
}
```

{% endtab %}
{% endtabs %}

{% hint style="info" %}
You can't create an iMessage Group, change its name, or add/remove participants to it via the API. You can only receive and reply to incoming messages/attachments.
{% endhint %}

## Send a voice message

<figure><img src="https://119477745-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2Fgit-blob-e4a83226ce95b79e119d95c35287e7b655a0fd63%2Fvoice_message.jpeg?alt=media" alt="" width="375"><figcaption><p>An example of how voice/audio messages look in iMessage</p></figcaption></figure>

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/message/send/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Request Body

| Name                                         | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contact<mark style="color:red;">\*</mark>    | String | Phone number or Email.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| media\_url<mark style="color:red;">\*</mark> | String | <p>The string must be a full URL of your audio file. URL should start with <code>https\://...</code>, <code>http</code> links (without SSL) are not supported. This must be a publicly accessible URL: we will not be able to reach any URLs that are hidden or that require authentication. Max length of each URL: 256 characters.</p><p>Audio files of the following formats are supported: <code>mp3</code>, <code>wav</code>, <code>m4a</code>, <code>caf</code>, <code>aac</code>.</p> |
| sender                                       | String | Optional. Your dedicated sender name. This parameter will be ignored if you send a request to a recipient who is added as a sandbox contact. DON'T use a phone number as a value for this parameter.                                                                                                                                                                                                                                                                                         |
| passthrough                                  | String | A string of metadata you wish to store in the request. Will be sent alongside all webhooks associated with the outbound message. Max length: 1000 characters.                                                                                                                                                                                                                                                                                                                                |

{% tabs %}
{% tab title="200: OK Request for send received" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "recipient": "+13231112233",
    "text": "text"
}
```

Phone number will be converted to the next format `+13231112233`, without spaces and brackets. Email will be converted into a lowercase format.
{% endtab %}

{% tab title="400: Bad Request Request for send failed" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "recipient": "+13231112233",
    "text": "text"
}
```

{% endtab %}

{% tab title="402: Payment Required No available request. Need purchase additional requests." %}

```json
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "recipient": "+13231112233",
    "text": "text"
}
```

{% endtab %}
{% endtabs %}

{% hint style="info" %}
To send a voice message to an iMessage group, you need to use the `group` field instead `contact`.
{% endhint %}

## Send a reaction

<figure><img src="https://119477745-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2Fgit-blob-0f880188cc468788912d0fbc23600addca6ec001%2Fsend_reactions.png?alt=media" alt="" width="277"><figcaption><p>An example of how tapback reactions looks like in iMessage</p></figcaption></figure>

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/message/send/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Request Body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>contact<mark style="color:red;">*</mark></td><td>String</td><td>Phone number or Email.</td></tr><tr><td>message_id<mark style="color:red;">*</mark></td><td>String</td><td>The <code>message_id</code> that you got from the webhook.</td></tr><tr><td>reaction<mark style="color:red;">*</mark></td><td>String</td><td><p>Possible values:</p><p><code>love</code>, <code>like</code>, <code>dislike</code>, <code>laugh</code>, <code>emphasize</code>, <code>question</code>, <code>-love</code>, <code>-like</code>, <code>-dislike</code>, <code>-laugh</code>, <code>-emphasize</code>, <code>-question</code>. Reactions that started with <code>-</code> mean "remove" it from the message.</p><p>You can check the <a href="https://support.apple.com/HT206894">Apple guide</a> about reactions and tapbacks.</p></td></tr></tbody></table>

## Show typing indicator

<figure><img src="https://119477745-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2Fgit-blob-4023a56422c7245399216621a1314c0265a143c2%2Ftyping_animation.gif?alt=media" alt="" width="374"><figcaption></figcaption></figure>

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/message/show-typing/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Request Body

| Name                                          | Type    | Description                                                                                    |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| message\_id<mark style="color:red;">\*</mark> | String  | The `message_id` that you got from the webhook.                                                |
| typing                                        | Integer | This value means how long in the seconds we will show typing indicator. The max value is `60`. |
| read                                          | Bool    | Mark conversation as read                                                                      |

Alternatively, you can use the "contact" and "sender" parameters:

| Name                                      | Type    | Description                                                                                    |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| contact<mark style="color:red;">\*</mark> | String  | Phone number or Email.                                                                         |
| sender<mark style="color:red;">\*</mark>  | String  | ID of your sender name.                                                                        |
| typing                                    | Integer | This value means how long in the seconds we will show typing indicator. The max value is `60`. |
| read                                      | Bool    | Mark conversation as read. Default `true` if presenting typing indicator.                      |

{% hint style="info" %}
The indicator will be automatically hidden as soon as you send an outbound message
{% endhint %}

### Typing indicator limitations

{% hint style="danger" %}
**This feature has important limitations**. If there is no two-way conversation for more than 5 minutes, then any attempts to show the animation will fail. You should use this feature in active conversations only. In the video below, you can see examples with these limitations.
{% endhint %}

{% embed url="<https://youtu.be/uEyOejJCDlY>" fullWidth="false" %}
An example of testing typing indicator between two contacts
{% endembed %}

### Send "Read" status

<figure><img src="https://119477745-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2Fgit-blob-5738fa18e15e6e88fc7786752587f263ec11cbdd%2Fread_status%20(1).jpg?alt=media" alt="" width="325"><figcaption></figcaption></figure>

To let your contacts know that you've accepted a message, you can mark a conversation as read. Todo it, just add "read" to your JSON Body. Example:

```json
{ 
  "typing": 5, // It's optional to show typing indicator here
  "read": true 
}
```

## Failed responses

{% hint style="success" %}
Please note that in most cases, handling failed responses can be far more important than handling successful ones. If something goes wrong, it may help to quickly take further action.
{% endhint %}

If your request has a failed status, you will receive a JSON response with the following content:

```json
{
    "success": false,
    "code": 100,
    "message": "string"
}
```

{% hint style="warning" %}
It is important to implement handling the "code" field. It helps to understand how to manage your further actions according to the [error code](https://docs.loopmessage.com/imessage-conversation-api/error-codes).
{% endhint %}

{% hint style="info" %}
The message field is optional and briefly describes the reason for the error. Please do not pass this to the destination users/recipients. Use the "code" field to map errors and show localized error text to them.
{% endhint %}

## Response example

{% tabs %}
{% tab title="200: OK Request for send received" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": true,
    "recipient": "+13231112233",
    "text": "text"
}
```

Phone number will be converted to the next format `+13231112233`, without spaces and brackets. Email will be converted into a lowercase format.
{% endtab %}

{% tab title="400: Bad Request Request for send failed" %}

```json
{
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "recipient": "+13231112233",
    "text": "text"
}
```

{% endtab %}

{% tab title="402: Payment Required No available request. Need purchase additional requests." %}

```json
    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
    "success": false,
    "message": "error description",
    "recipient": "+13231112233",
    "text": "text"
}
```

{% endtab %}
{% endtabs %}

## Limits

#### Messages

* If you need to send messages to a few contacts who haven't recently sent you any inbound messages, you must keep a minimal interval of 2 minutes between each such message. Otherwise, your request may be rejected.
* Max text length in each message must be less than 10000 characters. Otherwise, all extra characters will be truncated. If you have larger requirements, we recommend breaking the message up into several smaller messages.

  You can use characters from any language, emojis, and `\n` for new lines. HTML tags aren't supported.

#### Attachments

* When you send an attachment file for the first time, it takes a while for it to download into the cache before it's sent to the recipient. If your attachments are large (more than a couple of megabytes), it will take a while for them to be delivered to your contact.\
  If you update your file but it still has the same URL, the cached version still be used. To avoid a cached version, you need to change the file URL (for example, by renaming the file name).

## Best Practices

### Handling failed cases

It's recommended to implement handling of the next failed/error cases:

* If the response code for sending a message is **not equal** `200`. In most cases, it means that something is wrong with your parameters.
* You receive a [webhook](https://docs.loopmessage.com/webhooks#alert-types) with the type `message_failed` or message [status](https://docs.loopmessage.com/imessage-conversation-api/statuses) is `failed`.\
  \
  This means that the message can't be delivered to this recipient. Check the `error_code` [JSON field](https://docs.loopmessage.com/webhooks#error-codes) to better understand your case.
* You receive a [webhook](https://docs.loopmessage.com/webhooks#alert-types) with the type `message_sent`, but the `success` JSON field contains the `false` value.\
  \
  That means a message was successfully sent, but it was unsuccessfully delivered on the recipient side. Examples: your recipient blocked you or uses filters from unknown senders. This case is equal to "Not delivered" status in the Messages app.
* You receive a [webhook](https://docs.loopmessage.com/webhooks#alert-types) with the type `message_timeout` or message [status](https://docs.loopmessage.com/imessage-conversation-api/statuses) is `timeout`.\
  \
  This happens if you passed the `timeout` parameter in the request to send a [single message](#send-single-message). In this case, this means that we failed to deliver a message within the specified time, and it was assigned the timeout status.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/send-message.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Statuses

## Request for check message status

<mark style="color:blue;">`GET`</mark> `https://a.loopmessage.com/v1/message/status/{id}/`

You can check the status of each individual message based on the message ID.

#### Path Parameters

<table><thead><tr><th width="103">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td>id<mark style="color:red;">*</mark></td><td>String</td><td>ID that you received after a successful request</td></tr></tbody></table>

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

{% tabs %}
{% tab title="200: OK Request for send received" %}
**Some fields in JSON may be optional**

<pre><code>{
<strong>    "message_id": "2BC4FD6A-CE49-439F-81DF-E895C09CA49C",
</strong>    "status": "processing",
    "contact": "+13231112233",
    "text": "text",
    "error_code": 100,
    "last_update": "2021-12-31T23:59:59.809Z"
}
</code></pre>

{% endtab %}

{% tab title="400: Bad Request Request for send failed" %}
**Some fields in JSON may be optional**

```
{
    "error_code": 100,
    "message": "error description"
}
```

{% endtab %}

{% tab title="404: Not Found Unable to find a message with this ID " %}

{% endtab %}
{% endtabs %}

{% hint style="info" %}
**error\_code** - optional field for cases when sending was unsuccessful.
{% endhint %}

### Available statuses

{% hint style="info" %}
All values will be in lowercase format
{% endhint %}

<table><thead><tr><th width="150">Value</th><th width="601.9333333333334">Description</th></tr></thead><tbody><tr><td>processing</td><td>Send request was successfully accepted and is being processed</td></tr><tr><td>failed</td><td>Failed to send or deliver a message</td></tr><tr><td>delivered</td><td>Message was successfully delivered to a recipient</td></tr><tr><td>unknown</td><td>Message status is currently unknown</td></tr></tbody></table>


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/statuses.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Error codes

### Error codes

<table><thead><tr><th width="150">Code</th><th>Description</th></tr></thead><tbody><tr><td>100</td><td>Bad request. It's a generic response if error case is not moved into separate error code.</td></tr><tr><td>110</td><td>Missing credentials in request</td></tr><tr><td>115</td><td>One or more required parameters are invalid</td></tr><tr><td>120</td><td>One or more required parameters for the request are missing</td></tr><tr><td>125</td><td>One or more parameters in the request are invalid</td></tr><tr><td>130</td><td>Authorization key is invalid or does not exist</td></tr><tr><td>140</td><td>No "text" parameter in request</td></tr><tr><td>150</td><td>No "contact" parameter in request</td></tr><tr><td>160</td><td>Invalid contact</td></tr><tr><td>165</td><td>Invalid group</td></tr><tr><td>170</td><td>Invalid contact email address</td></tr><tr><td>180</td><td>Invalid contact phone number</td></tr><tr><td>190</td><td>A phone number is not mobile</td></tr><tr><td>200</td><td>No conversation with sandbox contact</td></tr><tr><td>210</td><td>Unable to get Sender for this contact</td></tr><tr><td>220</td><td>Invalid sender name</td></tr><tr><td>230</td><td>An internal error occurred while trying to use the specified sender name.</td></tr><tr><td>240</td><td>Sender name is not activated or unpaid</td></tr><tr><td>250</td><td>Sender name suspended</td></tr><tr><td>260</td><td>No active purchased sender name to send message</td></tr><tr><td>270</td><td>This request requires a dedicated sender name</td></tr><tr><td>340</td><td>This recipient blocked any type of messages</td></tr><tr><td>290</td><td>This API request is deprecated and not supported</td></tr><tr><td>300</td><td>Your account is suspended</td></tr><tr><td>310</td><td>Your account is blocked</td></tr><tr><td>320</td><td>The phone number in your account has not been verified.</td></tr><tr><td>330</td><td>Your account is suspended due to debt</td></tr><tr><td>500</td><td>This contact has opted out from your messages</td></tr><tr><td>510</td><td>No recent conversation with this contact</td></tr><tr><td>520</td><td>Unable to send outbound messages until this recipient initiates a conversation with your sender</td></tr><tr><td>530</td><td>Unable to init conversation with contact</td></tr><tr><td>540</td><td>You have reached the limit of sending messages to recipients who have not been contacted for a long time.</td></tr><tr><td>550</td><td>Reach your pricing plan limit</td></tr><tr><td>580</td><td>Invalid <code>effect</code> parameter</td></tr><tr><td>590</td><td>Invalid <code>message_id</code> for reply</td></tr><tr><td>595</td><td>Invalid or non-existent <code>message_id</code></td></tr><tr><td>600</td><td>Invalid <code>reaction</code> parameter</td></tr><tr><td>610</td><td><code>reaction</code> or <code>message_id</code> is invalid or does not exist</td></tr><tr><td>620</td><td>Unable to use <code>effect</code> and <code>reaction</code> parameters in the same request.</td></tr><tr><td>630</td><td>Need to set up a vCard file for this sender name in the dashboard</td></tr><tr><td>640</td><td>No media file URL - <code>media_url</code></td></tr><tr><td>1000</td><td>Internal error during the sending process</td></tr><tr><td>1010</td><td>Unable to send message. It means that the message was tried to be sent, but failed. You can re-try to send your request again after a short delay.</td></tr><tr><td>1020</td><td>The message was sent, but in destination service returned a "<a href="https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-Mk3R2LHrqWic_8rX_Bp%2Fuploads%2FfFd4FfgfBeCCmzGGT0z3%2Fnot%20delivered.png?alt=media&#x26;token=1258de8e-a281-4b20-9f00-2f30bc0a9fcb">Not delivered</a>" status in the response. You can re-try to send your request after a long delay. If you get same same error code a few times in a row, you should stop sending messages to the contact to prevent bouncing issues.</td></tr><tr><td>1030</td><td>The message was sent, but in destination service didn't return a delivery confirmation. In most cases, it means that the message has not been delivered. In some cases, the message could be delivered, but without a confirmation.</td></tr><tr><td>1110</td><td>Unable to send SMS if the recipient is an email address</td></tr><tr><td>1120</td><td>Unable to send SMS if the recipient is group</td></tr><tr><td>1130</td><td>Unable to send SMS with marketing content</td></tr><tr><td>1140</td><td>Unable to send audio messages through SMS</td></tr><tr><td></td><td></td></tr></tbody></table>


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/error-codes.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Opt-in

By default, you can use the Opt-in URL that was generated in the dashboard. But if you need customization, you can try generating a unique URL for each user. Using this method helps with the following things:

* End-toEnd analytics
* Tracking users
* Attach custom data to each opt-in
* Generate a unique text for each opt-in


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/opt-in.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Backend method

This approach helps that you generate a unique URL on your backend, which is then passed to the frontend. When generating a URL, you can include various parameters that will be passed in a webhook once a user successfully init a conversation.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/opt-in/generate-url/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Request Body

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td>body</td><td>String</td><td>Text that will be prefilled in the destination app</td></tr></tbody></table>

Any other fields that you pass in the JSON will be returned in the webhook when the user completes the opt-in process.

**Request with custom Body example:**

```
{
  "body": "Hey guy, want to test end-to-end analytics a little? [opt-in-code]",
  "click_id": "your-unique-id",
  "utm_campaign": "quick-loan",
  "utm_medium": "google"
}
```

In case of customize opt-in text, you can use the next method:

**body** with `[opt-in-code]` is a required parameter. The server replaces `[opt-in-code]` with a unique user code, which is required by the system to match opt-in with a specific contact.

In case of using shared sender names, you will need to include the next parameter in the request:

```
{
  ...
  "sender_type": "shared"
}
```

#### **Response**

The API response contains unique links generated for the provided data. Example response:

```
{
  "id": "3718be9c-17bc-412e-9790-c4768ca5df3e",
  "imessage": "imessage://ahoy%40imsg.tel&body=Hey%20guy%2C%20want%20to%20test%20end-to-end%20analytics%20a%20little%3F%20%22%23FHyh-%21dfaN%22",
  "sms": "sms:ahoy%40imsg.tel&body=Hey%20guy%2C%20want%20to%20test%20end-to-end%20analytics%20a%20little%3F%20%22%23FHyh-%21dfaN%22",
  "whatsapp: "whatsapp://send?phone=hi%40imsg.co&text=hello%20%22%232M6t-%21DXSy%22%20world",
  "url": "https://opt-in.imsg.link/opt-in/0Rig0/?id=3718be9c-17bc-412e-9790-c4768ca5df3e&body=Hey%20guy%2C%20want%20to%20test%20end-to-end%20analytics%20a%20little%3F%20%22%5Bopt-in-code%5D%22"
}
```

Use any of these links to redirect users to the destination messaging app.

\
**Webhook example**

```json
{
    "contact": "+155566678958",
    "event": "message_inbound",
    "language": {
      "code": "en",
      "name": "English"
    },
    "message_id": "2a12f7ed-da37-49fd-bbf9-e2965adfb01d",
    "organization_id": "e2229e7b-29df-486d-924e-7dae925b0796",
    "parameters": {
      "click_id": "your-unique-id",
      "utm_medium": "google",
      "utm_campaign": "quick-loan"
    },
    "text": "Hey guy, want to test end-to-end analytics a little?",
    "type": "opt_in",
    "webhook_id": "d37985d1-d648-4d42-ac69-ae72e08da86e"
}
```

## Key Points <a href="#key-points" id="key-points"></a>

1. The backend method helps provide more control over URL generation and avoid CORS restrictions.
2. The response contains links for user interaction:
   * **iMessage**: For iOS 13 and above.
   * **SMS:** For iOS 12 and below, Android, and desktop devices.
3. When using smart links (https URLs from the response), the user must grant the browser permission to open the Messages app. Currently, this URL works only on Apple devices.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/opt-in/backend-method.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Frontend method

<mark style="color:green;">`GET`</mark> `https://t.imsg.link/tracker-api/v1/generate-url/{organization_id}/`

Additional parameters are passed as GET query parameters.

#### **Headers**

There are **no headers** required. Authentication is **not needed**.

#### Path parameter

<table><thead><tr><th width="185.49609375">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>organization_id</code><mark style="color:red;">*</mark></td><td>String</td><td><strong>Required</strong>. Your organization ID.</td></tr></tbody></table>

**Query parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td>body</td><td>String</td><td>Text that will be prefilled in the destination app</td></tr></tbody></table>

**Example Request**

Example URL with parameters:

`GET https://t.imsg.link/tracker-api/v1/generate-url/{organization_id}/?body=hello%20world%20[opt-in-code]&param1=abcd1234&param2=google&param3=mysite.com`

**Example Response**

```
{ 
    "id": "6ad46341-4c91-4d01-a943-ea97f8e00d74", 
    "imessage": "imessage://hi%40imsg.co&body=hello%20%22%232M6t-%21DXSy%22%20world", 
    "sms": "sms:hi%40imsg.co&body=hello%20%22%232M6t-%21DXSy%22%20world", 
    "whatsapp: "whatsapp://send?phone=hi%40imsg.co&text=hello%20%22%232M6t-%21DXSy%22%20world",
    "url": "https://opt-in.imsg.link/opt-in/5cTjZ/?id=6ad46341-4c91-4d01-a943-ea97f8e00d74&body=hello%20%5Bopt-in-code%5D%20world" }
}
```

In case of using shared sender names, you will need to include `sender_type=shared` query parameter in the request:

```
GET https://t.imsg.link/tracker-api/v1/generate-url/{organization_id}/?body=...&sender_type=shared
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/opt-in/frontend-method.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Campaigns

- [New campaign](https://docs.loopmessage.com/imessage-conversation-api/campaigns/new.md)


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/campaigns.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# New campaign

{% hint style="danger" %}
**This feature is experimental. It's highly recommended to test it with a few contacts before using it in production.**
{% endhint %}

{% hint style="warning" %}
This API requires you to have active paid services. These API's does not work with the sandbox environment.
{% endhint %}

Campaigns are a feature that allows you to schedule bulk messaging to a list of contacts. This method will adhere to all necessary rules and intervals to ensure successful delivery. This method supports two approaches:

* Sending the same text to an array of contacts
* An array of requests where the message can be individualized for each contact.

{% hint style="info" %}
You can only use this method to send messages to contacts who have already communicated with your sender name.

You **CAN'T** use this method to initiate a conversation with a new contact (i.e., cold messaging).
{% endhint %}

### Schedule a campaign for an array of contacts

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/campaigns/new/`

#### Request body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name<mark style="color:red;">*</mark></td><td>String</td><td>New name for the campaign.</td></tr><tr><td>contacts<mark style="color:red;">*</mark></td><td>Array</td><td>An array of strings.</td></tr><tr><td>text<mark style="color:red;">*</mark></td><td>String</td><td>Campaign text</td></tr><tr><td>attachments</td><td>Array</td><td>Optional. An array of strings. The string must be a full URL of your image. URL should start with <code>https://</code>. <strong>HTTP links (without SSL) are not supported</strong>. This must be a publicly accessible file URL: we will not be able to reach any URLs that are hidden or that require authentication. Max length of each URL: 256 characters, max elements in the array: 3.</td></tr></tbody></table>

**JSON payload example**

```json
{
  "name": "My new campaign",
  "text": "Hello",
  "contacts": ["+13231112233", "+13232112233", "+13233112233"]
}
```

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
  "id": "UUID String",
  "name": "String",
  "api_key": "String",
  "create_date": "2025-01-01T23:59:59Z"
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}

### Schedule a campaign with an array of requests

This API works in the same way, but you need to pass the same parameters as an array.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/campaigns/new/`

**JSON payload example**

```json
{
  "name": "My new campaign",
  "messages" [
    {
      "text": "Hello 1",
      "contact": "+13231112233",
    },
    {
      "text": "Hello 2",
      "contact": "+13232112233",
    },
    {
      "text": "Hello 3",
      "contact": "+13232112233",
      "attachments": ["https://mycdn.com/image.png"]
    }
  ]
}
```

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
  "id": "UUID String",
  "name": "String",
  "api_key": "String",
  "create_date": "2025-01-01T23:59:59Z"
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}

### Additional schdule parameters

Use these parameters to specify the schedule for your campaign.

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>from_date</td><td>String</td><td><p>Date when will need to begin the campaign.</p><p><code>YYYY-MM-DD</code> format date. For example: <code>2010-12-31</code>. Default: <code>today</code>.</p></td></tr><tr><td>from_time</td><td>String</td><td><p>From what time will we need to start sendings.</p><p><code>HH:mm</code> format time. For example: <code>13:30</code>.</p><p>Default: <code>10:00</code>.</p></td></tr><tr><td>to_time</td><td>String</td><td><p>Until what time will we need to end sendings.</p><p><code>HH:mm</code> format time. For example: <code>23:59</code>.</p><p>Default: <code>22:00</code>.</p></td></tr><tr><td>timezone</td><td>String</td><td><p>In which time zone should from_time and to_time be considered.</p><p><a href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List">TZ identified</a> format, eg: America/Los_Angeles.</p><p>Default: <code>America/New_York</code>.</p></td></tr></tbody></table>

**JSON payload example**

Array of contacts

```json
{
  "name": "My new campaign",
  "from_date": "2026-12-31",
  "from_time": "10:00",
  "to_time": "19:00",
  "text": "Hello",
  "contacts": ["+13231112233", "+13232112233", "+13233112233"]
}
```

An array of messages

```json
{
  "name": "My new campaign",
  "from_date": "2026-12-31",
  "from_time": "10:00",
  "to_time": "19:00",
  "messages" [
    {
      "text": "Hello 1",
      "contact": "+13231112233",
    },
    {
      "text": "Hello with attachment",
      "contact": "+13232112233",
      "attachments": ["https://mycdn.com/image.png"]
    }
  ]
}
```

### Additional message parameters

All these parameters are optional.

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>effect</td><td>String</td><td><p>Add effect to your message. Possible values: <code>slam</code>, <code>loud</code>, <code>gentle</code>, <code>invisibleInk</code>, <code>echo</code>, <code>spotlight</code>, <code>balloons</code>, <code>confetti</code>, <code>love</code>, <code>lasers</code>, <code>fireworks</code>, <code>shootingStar</code>, <code>celebration</code>.</p><p>You can check the <a href="https://support.apple.com/HT206894">Apple guide</a> about <code>expressive messages</code>.</p></td></tr><tr><td>subject</td><td>String</td><td>Your message subject. A recipient will see this subject as a bold title before the text. Only for iMessage.</td></tr></tbody></table>

**JSON payload example**

Array of contacts

```json
{
  "name": "My new campaign",
  "text": "Hello",
  "contacts": ["+13231112233", "+13232112233", "+13233112233"],
  "effect": "echo",
  "subject": "String"
}
```

Array of messages

```json
{
  "name": "My new campaign",
  "messages" [
    {
      "text": "Hello 1",
      "contact": "+13231112233",
      "effect": "love"
    },
    {
      "text": "Hello with attachment",
      "contact": "+13232112233",
      "attachments": ["https://mycdn.com/image.png"],
      "subject": "String"
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/imessage-conversation-api/campaigns/new.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Audience

## Get the organization's audience list

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/audience/list/?page=1&per_page=20&sort_by=desc`

**Headers**

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

**Query parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>page</code></td><td>Integer</td><td>The current page of the paginated request. Default: <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>The number of items to be returned for a specific page. Default: <code>20</code>. Max value: <code>1000</code>.</td></tr><tr><td><code>sort_by</code></td><td>String</td><td>Possible values: <code>asc</code> or <code>desc</code>. Default: <code>desc</code>.</td></tr><tr><td><code>from_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr><tr><td><code>to_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr><tr><td><code>search</code></td><td>String</td><td>Phone number or email</td></tr></tbody></table>

**Response**

```
{
  "page": 1,
  "num_pages": 5,
  "per_page": 20,
  "count": 100,
  "items": [
    "id": "string",
    "value": "string"  # Phone number or email
  ]
}
```

## Check audience status

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/audience/check-status/{contact}/`

**Headers**

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

**Path parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>contact</code></td><td>String</td><td><strong>Required</strong>. Email address or phone number of the contact to delete. Phone number must be in the international format (include country code and start with <code>+</code>, for example: <code>+13231112233</code>)</td></tr></tbody></table>

**Response**

```
{
  "status": "string"  # Values: active, unsubscribed, unknown
}
```

## Unsubscribe contact

***

<mark style="color:green;">`DELETE`</mark> `https://a.loopmessage.com/api/v1/audience/delete/{contact}/`

**Headers**

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

**Path parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>contact</code></td><td>String</td><td><strong>Required</strong>. Email address or phone number of the contact to delete. Phone number must be in the international format (include country code and start with <code>+</code>, for example: <code>+13231112233</code>)</td></tr></tbody></table>


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/audience.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Messages history

## Get organization message history

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/audience/messages/{contact}/?page=1&per_page=20&sort_by=desc`

**Headers**

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Path parameter

<table><thead><tr><th width="115.05859375">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>contact</code><mark style="color:red;">*</mark></td><td>String</td><td><strong>Required</strong>. Email address or phone number of the contact to delete. Phone number must be in the international format (include country code and start with <code>+</code>, for example: <code>+13231112233</code>)</td></tr></tbody></table>

**Query parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>page</code></td><td>Integer</td><td>The current page of the paginated request. Default: <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>The number of items to be returned for a specific page. Default: <code>20</code>. Max value: <code>1000</code>.</td></tr><tr><td><code>sort_by</code></td><td>String</td><td>Possible values: <code>asc</code> or <code>desc</code>. Default: <code>desc</code>.</td></tr><tr><td><code>from_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr><tr><td><code>to_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr><tr><td><code>direction</code></td><td>String</td><td><code>inbound</code> or <code>outbound</code></td></tr><tr><td><code>type</code></td><td>String</td><td></td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "status": "unsubscribed",
  "items": [
    {
      "id": "uuid",
      "create_date": "iso8 format date",
      "channel": "imessage",
      "direction": "outbound",
      "language": "EN",
      "type": "text",
      "text": "string"
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/messages-history.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Opt-in history

## Get organization opt-in history

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/audience/tracker/?page=1&per_page=20&sort_by=desc`

**Headers**

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

**Query parameters**

<table><thead><tr><th width="167.33333333333331">Name</th><th width="83">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>page</code></td><td>Integer</td><td>The current page of the paginated request. Default: <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>The number of items to be returned for a specific page. Default: <code>20</code>. Max value: <code>1000</code>.</td></tr><tr><td><code>sort_by</code></td><td>String</td><td>Possible values: <code>asc</code> or <code>desc</code>. Default: <code>desc</code>.</td></tr><tr><td><code>from_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr><tr><td><code>to_date</code></td><td>String</td><td>YYYY-MM-DD format date. For example: <code>2010-12-31</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 7,
  "per_page": 20,
  "count": 132,
  "items": [
    {
      "id": "string",
      "ip_address": "127.0.0.1",
      "organization": "uuid string",
      "origin": "https://your-website.com/",
      "type": "opt_in",
      "create_date": "2025-12-31T23:59:59+00:00",
      "geo": {
        "city": "New York",
        "country": "US",
        "europe_union": false,
        "postal_code": "10001",
        "region": "NY",
        "time_zone": "America/New_York"
      },
      "user_agent": {
        "bot": false,
        "browser": "Safari 18.0",
        "device": "Mac",
        "email_client": false,
        "mobile": false,
        "os": "Mac OS X 10.15.7"
      }
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/opt-in-history.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Webhook history

Use this method to get a history of webhooks that have been sent to you.

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/webhooks/history/?page=1&per_page=20&sort_by=desc`

You can use a contact ID or a phone number/email address (depending on what the user provided you with when subscribing).

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "attempt": 1,
      "create_date": "2025-01-27T22:23:51Z",
      "event_type": "message_inbound",
      "json": {
        "contact": "+155566678958",
        "event": "message_inbound",
        "language": {
          "code": "de",
          "name": "German"
        },
        "message_id": "2a12f7ed-da37-49fd-bbf9-e2965adfb01d",
        "organization_id": "e2229e7b-29df-486d-924e-7dae925b0796",
        "parameters": {
          "param1": "abcd1234",
          "param2": "google",
          "param3": "mysite.com"
        },
        "text": "Hello world",
        "type": "opt_in",
        "webhook_id": "d37985d1-d648-4d42-ac69-ae72e08da86e"
      }
    }
  ]
}
```

\\


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/webhook-history.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Organizations

- [Organizations list](https://docs.loopmessage.com/dashboard/organizations/list.md)
- [Manage organization](https://docs.loopmessage.com/dashboard/organizations/manage.md)
- [New organization](https://docs.loopmessage.com/dashboard/organizations/new.md)


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/organizations.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Organizations list

{% hint style="warning" %}
**Important requirements:**

1\) This API requires you to use an API Key from the Default organization (the first organization in your account);

2\) This API requires you to have active paid services. These API's does not work with the sandbox environment.
{% endhint %}

Use this method to get a list of all available organizations.

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/organizations/list/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr><tr><td><code>search</code></td><td>String</td><td>Optional. Filter organizations by a specific value in name.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "status": "active",
      "create_date": "2025-01-01T23:59:59Z"
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/organizations/list.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Manage organization

{% hint style="warning" %}
**Important requirement**

This API requires you to have active paid services. These API's does not work with the sandbox environment.
{% endhint %}

{% hint style="danger" %}
Before using these API's, you need to fetch the organization ID from [another API request](https://docs.loopmessage.com/dashboard/organizations/list).
{% endhint %}

### Headers

All requests in this section will have the same headers.

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

### Organization details

{% hint style="warning" %}
The behaviour/response may vary depending on which organization's API key is used.

1. If you're using an API key from the Default organization (the first organization in your account), you can get a response for all organizations in your account, like admin access.
2. If you are using an API key from other organizations, you can only get a response related to that specific organization. You can't access other organizations.
   {% endhint %}

Use this method to get a list of sender names related to a specific organization

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/organizations/details/{id}/`

#### Path Parameters

<table><thead><tr><th width="103">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td>id<mark style="color:red;">*</mark></td><td>String</td><td>Sender pool ID</td></tr></tbody></table>

**Response example**

```json
{
    "id": "string",
    "name": "string",
    "status": "enum string",
    "create_date": "2025-01-27T22:23:51Z",
    "api_key": "string" // optional
}
```

### Update organization

{% hint style="warning" %}
**Important requirements!** This API requires you to use an API Key from the Default organization (the first organization in your account)
{% endhint %}

<mark style="color:green;">`PATCH`</mark> `https://a.loopmessage.com/api/v1/organizations/details/{id}/`

#### Request body

{% hint style="info" %}
Need to send only the fields that you need to change. It's not necessary to send all possible values from the list above.
{% endhint %}

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name</td><td>String</td><td>New name for the organization.</td></tr><tr><td>website</td><td>String</td><td>Your organization or product webpage.</td></tr><tr><td>support_url</td><td>String</td><td>A webpage where your users can get support related to your services.</td></tr><tr><td>country</td><td>String</td><td>Your organization country. Value should be in <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO-2 format</a>. For example: <code>US</code> for USA, <code>CA</code> for Canada, <code>GB</code> for United kingdom.</td></tr><tr><td>webhook_url</td><td>String</td><td>Optional. URL that will be used to fire webhooks related to this organization. This field required to receive an API key in the response.</td></tr><tr><td>webhook_header</td><td>String</td><td>Optional. Value that will be included in the webhooks <code>Authorization</code> header.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200: Accepted" %}
Response will be the same as in the <mark style="color:green;">`GET`</mark> method, but with updated values.
{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}

### Delete organization

{% hint style="danger" %}
Before delete organization, there should be no active sender names assigned to this organization.
{% endhint %}

{% hint style="warning" %}
**Important requirements!** This API requires you to use an API Key from the Default organization (the first organization in your account)
{% endhint %}

<mark style="color:green;">`DELETE`</mark> `https://a.loopmessage.com/api/v1/organizations/details/{id}/`

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
    "success": true,
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/organizations/manage.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# New organization

{% hint style="warning" %}
**Important requirements:**

1\) This API requires you to use an API Key from the Default organization (the first organization in your account);

2\) This API requires you to have active paid services. These API's does not work with the sandbox environment.
{% endhint %}

Use this method to create a new organization.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/organizations/new/`

#### Request body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name<mark style="color:red;">*</mark></td><td>String</td><td>New name for the organization.</td></tr><tr><td>website<mark style="color:red;">*</mark></td><td>String</td><td>Your organization or product webpage.</td></tr><tr><td>support_url<mark style="color:red;">*</mark></td><td>String</td><td>A webpage where your users can get support related to your services.</td></tr><tr><td>country<mark style="color:red;">*</mark></td><td>String</td><td>Your organization country. Value should be in <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO-2 format</a>. For example: <code>US</code> for USA, <code>CA</code> for Canada, <code>GB</code> for United kingdom.</td></tr><tr><td>webhook_url</td><td>String</td><td>Optional. URL that will be used to fire webhooks related to this organization. This field required to receive an API key in the response.</td></tr><tr><td>webhook_header</td><td>String</td><td>Optional. Value that will be included in the webhooks <code>Authorization</code> header.</td></tr></tbody></table>

**JSON payload example**

```json
{
  "name": "String",
  "website": "https://site.com/",
  "support_url": "https://site.com/contact-us/",
  "country": "US",
  "webhook_url": "https://site.com/webhook/",
  "webhook_header": "secure string"
}
```

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
  "id": "UUID String",
  "name": "String",
  "api_key": "String",
  "create_date": "2025-01-01T23:59:59Z"
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/organizations/new.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Senders

- [Senders list](https://docs.loopmessage.com/dashboard/senders/senders-list.md)
- [Manage sender name](https://docs.loopmessage.com/dashboard/senders/manage-sener-name.md)
- [Available payment plans](https://docs.loopmessage.com/dashboard/senders/get-a-list-of-available-payment-plans.md)
- [Order a new single sender name](https://docs.loopmessage.com/dashboard/senders/order-new-single-sender-name.md)
- [Order bulk sender names](https://docs.loopmessage.com/dashboard/senders/order-bulk-sender-names.md)
- [Webhooks](https://docs.loopmessage.com/dashboard/senders/webhooks.md): Handle status of message for each request


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Senders list

### Organization senders

Use this method to get a list of sender names related to a specific organization

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/sender/list/?page=1&per_page=20&sort_by=desc`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "status": "enum string",
      "create_date": "2025-01-27T22:23:51Z",
      "imessage_link": "URL string",
    }
  ]
}
```

### All sender names

Use this method to get a list of all sender names

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/sender/list/?page=1&per_page=20&sort_by=desc`

You can use a contact ID or a phone number/email address (depending on what the user provided you with when subscribing).

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "status": "enum string",
      "create_date": "2025-01-27T22:23:51Z",
      "imessage_link": "URL string",
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/senders-list.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Manage sender name

### Headers

All requests in this section will have the same headers.

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

### Sender name details

Use this method to get a list of sender names related to a specific organization

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/sender/{id}/`

#### Path Parameters

<table><thead><tr><th width="103">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td>id<mark style="color:red;">*</mark></td><td>String</td><td>ID that you received after a successful request</td></tr></tbody></table>

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
    "id": "string",
    "name": "string",
    "status": "enum string",
    "create_date": "2025-01-27T22:23:51Z",
    "imessage_link": "URL string",
}
```

### Update sender settings

{% hint style="warning" %}
**Important requirements!** This API requires you to use an API Key from the Default organization (the first organization in your account)
{% endhint %}

<mark style="color:green;">`PATCH`</mark> `https://a.loopmessage.com/api/v1/sender/{id}/`

#### Request body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>organization_id</td><td>String</td><td>ID of the new organization for this sender name.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200: Accepted" %}
Response will be the same as in the <mark style="color:green;">`GET`</mark> method, but with updated values.
{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}

### Cancel sender name

<mark style="color:green;">`DELETE`</mark> `https://a.loopmessage.com/api/v1/sender/{id}/cancel/`

{% hint style="warning" %}
The sender's name is canceled immediately. Please check the cancellation policy in Helpdesk before using this method.
{% endhint %}

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
    "success": true,
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/manage-sener-name.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Available payment plans

Use this method to get a list of available sender name plans

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/sender/plans/`

**Response**

```json
{
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "daily_contacts": 0,
      "monthly_contacts": 0,
      "monthly_fee": 100.00,
      "currency": "USD",
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/get-a-list-of-available-payment-plans.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Order a new single sender name

Use this method to order one sender name.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/sender/new/`

{% hint style="danger" %}
Before sending this request, you need to fetch `plan_id` from [another API request](https://docs.loopmessage.com/dashboard/senders/get-a-list-of-available-payment-plans).
{% endhint %}

{% hint style="warning" %}
To prevent billing issues, you can send this request once every 30 seconds.
{% endhint %}

{% hint style="info" %}
Once the request is accepted, you will be automatically charged from the attached billing method
{% endhint %}

### **To order a sender with a phone number**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>plan_id<mark style="color:red;">*</mark></td><td>String</td><td>Payment plan ID</td></tr><tr><td>phone_region<mark style="color:red;">*</mark></td><td>String</td><td>Default value <code>US</code>. Possible values: <code>US</code> or <code>GB</code>.</td></tr><tr><td>zip_code</td><td>String</td><td>Optional. 5-digit format, e.g. <code>90210</code>.<br>Only for <code>US</code> phone numbers.</td></tr><tr><td>sms_and_call</td><td>Bool</td><td>Optional.</td></tr><tr><td>forwarding_to_phone_number</td><td>String</td><td>Optional. Requires <code>"sms_and_call": true</code>. Phone number region should support call forwarding.</td></tr><tr><td>rcs</td><td>Bool</td><td>Optional.</td></tr><tr><td>whatsapp</td><td>Bool</td><td>Optional.</td></tr><tr><td>init_conversations</td><td>Bool</td><td>Optional. Enables the feature to send messages first.</td></tr><tr><td>contact</td><td>Object</td><td>Optional. Name and photo that will be used for the sender. Supported only in iMessage and WhatsApp.</td></tr><tr><td>port</td><td>Object</td><td>Optional. Data that required if phone number should be ported.</td></tr></tbody></table>

**Contact**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>first_name<mark style="color:red;">*</mark></td><td>String</td><td>Displayed first name</td></tr><tr><td>last_name</td><td>String</td><td>Optional. Displayed last name</td></tr><tr><td>photo_url</td><td>String</td><td>Optional. The string must be a full URL of your photo. This must be a publicly accessible file URL: we will not be able to reach any URLs that are hidden or that require authentication. <br>The photo must have a 1:1 aspect ratio (square).</td></tr></tbody></table>

```json
// Example:
{
...
 "contact": {
   "first_name": "John",
   "last_name": "Smith",
   "photo_url": "https://my.cdn.com/photo.png"
 }
}
```

**Port**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>phone_number<mark style="color:red;">*</mark></td><td>String</td><td>Phone number in international format. Eg: <code>+13231111111</code></td></tr><tr><td>account_number<mark style="color:red;">*</mark></td><td>String</td><td>Porting account number</td></tr><tr><td>pin<mark style="color:red;">*</mark></td><td>String</td><td>Porting pin</td></tr><tr><td>carrier<mark style="color:red;">*</mark></td><td>String</td><td>eg: Twilio</td></tr></tbody></table>

```json
// Example:
{
...
 "port": {
   "phone_number": "+13231111111",
   "account_number": "123456",
   "pin": "1234",
   "carrier": "Twilio"
 }
}
```

### **To order an email sender**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name<mark style="color:red;">*</mark></td><td>String</td><td>Name part</td></tr><tr><td>domain<mark style="color:red;">*</mark></td><td>String</td><td>Sender domain</td></tr><tr><td>plan_id<mark style="color:red;">*</mark></td><td>String</td><td>Payment plan ID</td></tr></tbody></table>

### **Response example**

```json
{
    "count": 1,
    "items": [
        {
            "id": "f41c27d2-1251-488f-bf10-267945199555",
            "phone_region": "US",
            "zip_code": "10001",
            "sms_and_call": true,
            "forwarding_to_phone_number": "+13231112233",
            "rcs": true
        }
    ]
}
```

### Test purchase

To test this request, you need to include the `"test": true` parameter in the JSON payload. Once the request is accepted, you will receive a webhook within a few minutes confirming the activation of the sender name.

Once the request is accepted, you should receive a webhook within a few minutes that simulates the sender's activation. In the production environment, you should receive this webhook within a few hours.

For this test flow, you need to have at least one active paid service. These API's does not work with the sandbox environment.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/order-new-single-sender-name.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Order bulk sender names

you should receive a webhook within a few minutes that simulates the sender beingUse this method for bulk ordering new sender names.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/sender/new/`

{% hint style="danger" %}
Before sending this request, you need to fetch `plan_id` from [another API request](https://docs.loopmessage.com/dashboard/senders/get-a-list-of-available-payment-plans).
{% endhint %}

{% hint style="warning" %}
To prevent billing issues, you can send this request once every 30 seconds.
{% endhint %}

**Request body**

{% hint style="info" %}
This request has the same fields and validations as in a single request. The difference is that it needs to send these values as an array.
{% endhint %}

```json
"senders" [
  {
    "phone_region": "US",
    "plan_id": "string",
  },
  {
    "name": "sender2",
    "domain": "example.com",
    "plan_id": "string",
  }
]
```

{% hint style="info" %}
Once the request is accepted, you will be automatically charged from the attached billing method
{% endhint %}

### **Order sender with a phone number**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>plan_id<mark style="color:red;">*</mark></td><td>String</td><td>Payment plan ID</td></tr><tr><td>phone_region<mark style="color:red;">*</mark></td><td>String</td><td>Default value <code>US</code>. Possible values: <code>US</code> or <code>GB</code>.</td></tr><tr><td>zip_code</td><td>String</td><td>Optional. Only for <code>US</code> phone numbers.</td></tr><tr><td>sms_and_call</td><td>Bool</td><td>Optional.</td></tr><tr><td>forwarding_to_phone_number</td><td>String</td><td>Optional. Requires <code>"sms_and_call": true</code>. Phone number region should support call forwarding.</td></tr><tr><td>rcs</td><td>Bool</td><td>Optional.</td></tr><tr><td>whatsapp</td><td>Bool</td><td>Optional.</td></tr><tr><td>init_conversations</td><td>Bool</td><td>Optional. Enables the feature to send messages first.</td></tr></tbody></table>

**Contact**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>first_name<mark style="color:red;">*</mark></td><td>String</td><td>Displayed first name</td></tr><tr><td>last_name</td><td>String</td><td>Optional. Displayed last name</td></tr><tr><td>photo_url</td><td>String</td><td>Optional. The string must be a full URL of your photo. This must be a publicly accessible file URL: we will not be able to reach any URLs that are hidden or that require authentication. <br>The photo must have a 1:1 aspect ratio (square).</td></tr></tbody></table>

```json
// Example:
"senders" [{
 ...
 "contact": {
    "first_name": "John",
    "last_name": "Smith",
    "photo_url": "https://my.cdn.com/photo.png"
 }
}]
```

**Port**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>phone_number<mark style="color:red;">*</mark></td><td>String</td><td>Phone number in international format. Eg: <code>+13231111111</code></td></tr><tr><td>account_number<mark style="color:red;">*</mark></td><td>String</td><td>Porting account number</td></tr><tr><td>pin<mark style="color:red;">*</mark></td><td>String</td><td>Porting pin</td></tr><tr><td>carrier<mark style="color:red;">*</mark></td><td>String</td><td>eg: Twilio</td></tr></tbody></table>

<pre class="language-json"><code class="lang-json">// Example:
"senders" [{
<strong>  ...
</strong>  "port": {
    "phone_number": "+13231111111",
    "account_number": "123456",
    "pin": "1234",
    "carrier": "Twilio"
  }
}]
</code></pre>

### **Response example**

```json
{
    "count": 1,
    "items": [
        {
            "id": "f41c27d2-1251-488f-bf10-267945199555",
            "phone_region": "US",
            "zip_code": "10001",
            "sms_and_call": true,
            "forwarding_to_phone_number": "+13231112233",
            "rcs": true
        }
    ]
}
```

### **Order an email sender**

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name<mark style="color:red;">*</mark></td><td>String</td><td>Name part</td></tr><tr><td>domain<mark style="color:red;">*</mark></td><td>String</td><td>Sender domain</td></tr><tr><td>plan_id<mark style="color:red;">*</mark></td><td>String</td><td>Payment plan ID</td></tr></tbody></table>

**Response example**

```json
{
    "count": 1,
    "items": [
        {
            "id": "f41c27d2-1251-488f-bf10-267945199555",
            "name": "sender@example.com"
        }
    ]
}
```

### Test purchase

To test this request, you need to include the `"test": true` parameter in the JSON payload. Once the request is accepted, you will receive a webhook within a few minutes confirming the activation of the sender name.

Once the request is accepted, you should receive a webhook within a few minutes that simulates the sender's activation. In the production environment, you should receive this webhook within a few hours.

For this test flow, you need to have at least one active paid service. These API's does not work with the sandbox environment.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/order-bulk-sender-names.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Webhooks

You can also receive webhooks when the status of your sender name changes. For this webhooks will be used the same rules like with events related to messaging.

**JSON example:**

```json
{
  "event": "sender_name_updated",
  "organization_id": "string",
  "phone_number": "+13231112233",
  "sender": "ID string",
  "status": "active",
  "webhook_id": "string"
}
```

<table><thead><tr><th width="159">Field</th><th width="118">Type</th><th width="450.1684011352885">Description</th></tr></thead><tbody><tr><td>webhook_id</td><td>String</td><td>Unique identifier of the event.</td></tr><tr><td>organization_id</td><td>String</td><td>ID of the organization to which the sender is assigned.</td></tr><tr><td>event</td><td>String</td><td>Check the <a href="#event-types">Event Types</a> section for possible values.</td></tr><tr><td>status</td><td>String</td><td>New sender name status. Possible values: <code>active</code>, <code>pending</code>, <code>canceled</code>, <code>canceled</code>, <code>suspended</code> .</td></tr><tr><td>phone_number</td><td>String</td><td>Optional Field. Assigned phone number</td></tr><tr><td>sender</td><td>String</td><td>Dedicated sender name ID.</td></tr></tbody></table>

### Event Types

{% hint style="info" %}
All values will be in lowercase and in snake\_case format
{% endhint %}

<table><thead><tr><th width="212.29250014646743">Event type</th><th width="490.99572483482325">Description</th><th></th></tr></thead><tbody><tr><td>sender_name_updated</td><td>Your sender has a status update</td><td></td></tr></tbody></table>

### Headers

These headers will be included in any webhook POST request.

<table><thead><tr><th width="342">Key</th><th width="405.01476014760146">Value</th></tr></thead><tbody><tr><td><strong>Content-Type</strong></td><td>application/json</td></tr><tr><td><strong>User-Agent</strong></td><td>LoopMessage</td></tr><tr><td><strong>Connection</strong></td><td>close</td></tr></tbody></table>


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/senders/webhooks.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Pools

- [List](https://docs.loopmessage.com/dashboard/pools/list.md)
- [Manage pool](https://docs.loopmessage.com/dashboard/pools/manage-pool.md)
- [New pool](https://docs.loopmessage.com/dashboard/pools/new-pool.md)


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/pools.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# List

Use this method to get a list of all sender pool related to a specific organization

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/pool/list/`

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "count": 1,
      "create_date": "2025-01-27T22:23:51Z"
    }
  ]
}
```

### All sender names

Use this method to get a list of all sender names

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/sender/list/?page=1&per_page=20&sort_by=desc`

You can use a contact ID or a phone number/email address (depending on what the user provided you with when subscribing).

#### Headers

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

#### Query Parameters

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>sort_by</code></td><td>String</td><td>Optional. Sorting order for results. Possible values: asc (ascending) or desc (default).</td></tr><tr><td><code>page</code></td><td>Integer</td><td>Optional. The page number to retrieve. Default is <code>1</code>.</td></tr><tr><td><code>per_page</code></td><td>Integer</td><td>Optional. Number of webhook records per page. Default is <code>20</code>.</td></tr></tbody></table>

**Response**

```json
{
  "page": 1,
  "num_pages": 1,
  "per_page": 20,
  "count": 1,
  "items": [
    {
      "id": "string",
      "name": "string",
      "status": "enum string",
      "create_date": "2025-01-27T22:23:51Z",
      "imessage_link": "URL string",
    }
  ]
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/pools/list.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Manage pool

### Headers

All requests in this section will have the same headers.

| Name                                              | Type   | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `Authorization`<mark style="color:red;">\*</mark> | String | API Key. Required<mark style="color:red;">\*</mark>. |
| `Content-Type`<mark style="color:red;">\*</mark>  | String | `application/json`                                   |

### Pool details

Use this method to get a list of sender names related to a specific organization

<mark style="color:green;">`GET`</mark> `https://a.loopmessage.com/api/v1/pool/{id}/`

#### Path Parameters

<table><thead><tr><th width="103">Name</th><th width="114">Type</th><th>Description</th></tr></thead><tbody><tr><td>id<mark style="color:red;">*</mark></td><td>String</td><td>Sender pool ID</td></tr></tbody></table>

**Response**

```json
{
    "id": "string",
    "name": "string",
    "status": "enum string",
    "create_date": "2025-01-27T22:23:51Z",
}
```

### Updated pool

<mark style="color:green;">`PATCH`</mark> `https://a.loopmessage.com/api/v1/sender/{id}/`

#### Request body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name</td><td>String</td><td>Optional. New name for the pool.</td></tr><tr><td>ids</td><td>Array</td><td>Optional. Array with sender name IDs.</td></tr></tbody></table>

**JSON Example**

```json
{
  "name": "pool1",
  "ids": ["id1", "id2", "id3"]
}
```

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
    "success": true,
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}

### Delete pool

<mark style="color:green;">`DELETE`</mark> `https://a.loopmessage.com/api/v1/sender/{id}/`

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
    "success": true,
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/pools/manage-pool.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# New pool

Use this method to create a new pool of sender names.

<mark style="color:green;">`POST`</mark> `https://a.loopmessage.com/api/v1/pool/new/`

{% hint style="danger" %}
Before sending this request, you need to fetch sender name IDs from [another API request](https://docs.loopmessage.com/dashboard/senders/senders-list).
{% endhint %}

#### Request body

<table><thead><tr><th width="228">Name</th><th width="117">Type</th><th>Description</th></tr></thead><tbody><tr><td>name</td><td>String</td><td>Optional. New name for the pool.</td></tr><tr><td>ids</td><td>Array</td><td>Optional. Array with sender name IDs.</td></tr></tbody></table>

**JSON Example**

```json
{
  "name": "new pool",
  "ids": ["id1", "id2", "id3"]
}
```

**Response**

{% tabs %}
{% tab title="200: Accepted" %}

```json
{
    "id": "string",
    "name": "string",
    "count": 1,
    "create_date": "2025-01-27T22:23:51Z"
}
```

{% endtab %}

{% tab title="400: Bad Request" %}

```json
{
    "code": 100,
    "success": false,
    "message": "error description",
}
```

{% endtab %}
{% endtabs %}


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/dashboard/pools/new-pool.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# Twilio API

You can use your current Twilio implementation, via the API or SDK, to send/receive messages through Loop Message. We tried to maintain backward compatibility with the Twilio API, and all you need to do is port your number from Twilio to us or order a new one in Loop Message.

**Required changes**

* Port your number from Twilio to us. Or you can order a new one with Loop Message.
* Need to change the host URL to `https://tw-api.loopmessge.com/`&#x20;
* Use Loop Message API key

And once phone numbers are active in LoopMessage, everything should work.

Below, we'll describe all parameters and provide examples of using this backward compatibility if you need to modify your implementation.

#### Using with 3rd party integrations or frameworks

It's common when you can use Twilio integration in some no-coding tools or CRM.

You need to ensure your integration allows you to override the Twilio host URL or proxy requests through another URL. Otherwise, we're not able to receive your Twilio requests.

When you integration asking for `Twilio SID` and `Account Auth Token`, you can always use the Loop Message API Key for these two parameters.

## **Send iMessage/SMS/RCS/WhatsApp**

<mark style="color:green;">`POST`</mark> `https://tw-api.loopmessage.com/2010-04-01/Accounts/{loop_message_api_key}/Messages.json`

Please note that you need to send a Loop Message API key as the path parameter in your requests. No need to pass the API key in the `Authorization` header.

#### Request Body

<table><thead><tr><th width="150">Name</th><th width="84">Type</th><th>Description</th></tr></thead><tbody><tr><td>To<mark style="color:red;">*</mark></td><td>String</td><td>Phone number, Email, or Contact ID.</td></tr><tr><td>Body<mark style="color:red;">*</mark></td><td>String</td><td>Your message text</td></tr><tr><td>From</td><td>String</td><td>Optional. ID of your sender name. Send message from a specific sender name.</td></tr><tr><td>MediaUrl</td><td>Array</td><td>Optional. An array of strings. The string must be a full URL of your image. URL should start with <code>https://</code>. <strong>HTTP links (without SSL) are not supported</strong>. This must be a publicly accessible file URL: we will not be able to reach any URLs that are hidden or that require authentication. Max length of each URL: 256 characters, max elements in the array: 5.</td></tr><tr><td>StatusCallback</td><td>String</td><td>Optional. The URL where you want to receive message status updates. Callback will be sent in Twilio format. Max length: 256 characters.</td></tr><tr><td>MessagingServiceSid</td><td>String</td><td>Optional. Sender pool ID create in the dashboard.</td></tr><tr><td>Effect</td><td>String</td><td><p>Optional. Add effect to your message. Possible values: <code>slam</code>, <code>loud</code>, <code>gentle</code>, <code>invisibleInk</code>, <code>echo</code>, <code>spotlight</code>, <code>balloons</code>, <code>confetti</code>, <code>love</code>, <code>lasers</code>, <code>fireworks</code>, <code>shootingStar</code>, <code>celebration</code>.</p><p>You can check the <a href="https://support.apple.com/HT206894">Apple guide</a> about <code>expressive messages</code>.</p></td></tr><tr><td>Subject</td><td>String</td><td>Optional. Your message subject. A recipient will see this subject as a bold title before the text.</td></tr><tr><td>ReplyToId</td><td>String</td><td><p>Optional. The <code>message_id</code> that you got from the webhook.</p><p>You can check the <a href="https://support.apple.com/HT211303">Apple guide</a> about the <code>reply to</code> feature.</p></td></tr></tbody></table>

{% hint style="info" %}
**Supported phone number formats**

Recipient phone numbers should be only in international formats with a country code. Otherwise will be impossible to verify a phone number.

Plus prefix `+` is optional. Spaces, dashes '`-`', brackets '`(123)`' - also optional.

Valid phone number format examples:

* 13231234567
* +13231111111
* +1 (323) 1111111
* +1 323 123 4567
* 1 (323)-123-4567
  {% endhint %}

{% hint style="info" %}
In case you need to send WhatsApp, you need to pass the contact in the following format: `whatsapp:+13231112233`
{% endhint %}

{% hint style="warning" %}
**Important**

When you receive a successful response with code 200 from sending a request, it means that the server accepted your request and added it to the queue. **But this does not mean that the message was delivered to the recipient or will be sent.**

To handle message status for this request, need to observe callbacks or use the API method to check the status by message ID, which you received in the JSON response.
{% endhint %}

#### Response example

```
{
  "account_sid": "{organization_id}",
  "api_version": "2010-04-01",
  "body": "your text",
  "date_created": "Fri, 24 May 2019 17:18:27 +0000",
  "date_sent": "Fri, 24 May 2019 17:18:28 +0000",
  "date_updated": "Fri, 24 May 2019 17:18:28 +0000",
  "direction": "outbound-api",
  "error_code": 30007,  # Optional
  "error_message": "Carrier violation",  # Optional
  "from": "+12019235161",
  "messaging_service_sid": "{pool_id}",
  "num_media": "0",
  "num_segments": "1",
  "price": null,
  "price_unit": "USD",
  "sid": "{message_id}",
  "status": "sent",
  "to": "+13231112233",
  "uri": "/2010-04-01/Accounts/{api_key}/Messages/{message_id}.json"
}
```

#### Inbound message

**Request example**

```json
{
    "From": "+17372222204",
    "To": "+17379990001",
    "Body": "Hello",
    "MessageSid": "string",
    "SmsSid": "string",
    "SmsStatus": "received",
    "ApiVersion": "2010-04-01",
    "AccountSid": "your_api_key",
    "MessagingServiceSid": "string", # Optional
    "NumMedia": "0",
}
```

#### Check message status

You can check the message statuses by following&#x20;

<mark style="color:green;">`POST`</mark> `https://tw-api.loopmessage.com/2010-04-01/Accounts/{loop_message_api_key}/Messages/{message_id}.json`

Please note that you need to send a Loop Message API key as the path parameter in your requests. No need to pass the API key in the `Authorization` header.

**Response example**

```json
{
  "account_sid": "{organization_id}",
  "api_version": "2010-04-01",
  "body": "your text",
  "date_created": "Fri, 24 May 2019 17:18:27 +0000",
  "date_sent": "Fri, 24 May 2019 17:18:28 +0000",
  "date_updated": "Fri, 24 May 2019 17:18:28 +0000",
  "direction": "outbound-api",
  "error_code": 30007,  # Optional
  "error_message": "Carrier violation",  # Optional
  "from": "+12019235161",
  "messaging_service_sid": "{pool_id}",  # Optional
  "num_media": "0",
  "num_segments": "1",
  "price": null,
  "price_unit": "USD",
  "sid": "message_id",
  "status": "sent",
  "to": "+18182008801",
  "uri": "/2010-04-01/Accounts/{api_key}/Messages/{message_id}.json"
}
```

#### Twilio Python SDK Example

```python
import requests
from twilio.http.http_client import TwilioHttpClient
from twilio.rest import Client
from twilio.http.response import Response as TwilioResponse

# Prepare proxy client
class ProxyTwilioHttpClient(TwilioHttpClient):
    def __init__(self, proxy_base_url: str):
        super().__init__()
        self.proxy_base_url = proxy_base_url.rstrip("/")

    def request(self, method, url, params=None, data=None, headers=None, auth=None, timeout=None, allow_redirects=False):

        rewritten_url = url.replace("https://api.twilio.com", self.proxy_base_url)

        resp = requests.request(
            method=method,
            url=rewritten_url,
            params=params,
            data=data,
            headers=headers,
            auth=auth,
            timeout=timeout,
            allow_redirects=allow_redirects
        )

        return TwilioResponse(resp.status_code, resp.text, resp.headers)

# Send message
def send_message():
    api_key = f'{your_loop_message_api_key}'  # Try to save it in your .env file
    http_client = ProxyTwilioHttpClient('https://tw-api.loopmessage.com/')
    client = Client(username=api_key, password=api_key, account_sid=api_key, http_client=http_client)

    message = client.messages.create(
        from_="+17372221122", body="Hi there", to="+13231112233",
    )
    # optional_fields = {messaging_service_sid="pool_id", media_url: [https://example.com/file.png]}

    print(message.body)
    
# Message status
def message_status():
    api_key = f'{your_loop_message_api_key}'  # Try to save it in your .env file
    http_client = ProxyTwilioHttpClient('https://tw-api.loopmessage.com/')
    client = Client(username=api_key, password=api_key, account_sid=api_key, http_client=http_client)

    message = client.messages("{message_id}").fetch()
    print(message.body)
```

#### Twilio TypeScript SDK Example

```typescript
import axios, { type Method } from "axios";
import qs from "qs";
import twilio, { RestException } from "twilio";

type TwilioRequestOptions = {
  method?: string;
  uri?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
};

class LoopProxyHttpClient {
  constructor(private readonly proxyBaseUrl: string) {}

  async request(opts: TwilioRequestOptions) {
    if (!opts.method) throw new Error("http method is required");
    if (!opts.uri) throw new Error("uri is required");

    const rewrittenUrl = opts.uri.replace(
      "https://api.twilio.com",
      this.proxyBaseUrl.replace(/\/+$/, ""),
    );

    const response = await axios({
      url: rewrittenUrl,
      method: opts.method as Method,
      headers: opts.headers,
      auth:
        opts.username && opts.password
          ? { username: opts.username, password: opts.password }
          : undefined,
      params: opts.params ?? undefined,
      paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "repeat" }),
      data: opts.data
        ? qs.stringify(opts.data, { arrayFormat: "repeat" })
        : undefined,
      validateStatus: () => true,
    });

    return {
      statusCode: response.status,
      body: response.data,
      headers: response.headers,
    };
  }
}

const loopApiKey = process.env.LOOP_MESSAGE_API_KEY;
if (!loopApiKey) {
  throw new Error("LOOP_MESSAGE_API_KEY is required");
}

const client = twilio(loopApiKey, loopApiKey, {
  httpClient: new LoopProxyHttpClient("https://tw-api.loopmessage.com"),
});

async function sendMessage() {
  const message = await client.messages.create({
    from: "+17372222204",
    to: "+13231112233",
    body: "Hi there",
    // messagingServiceSid: "pool_id",  ## Optinal
    // mediaUrl: ["https://example.com/file.png"],  # Optional
    // WhatsApp:
    // from: "whatsapp:+17372222204"
    // to: "whatsapp:+13231112233",
  });

  return message.sid;
}

async function fetchMessageStatus(messageSid: string) {
  const message = await client.messages(messageSid).fetch();
  return message;
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.loopmessage.com/twilio-api.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.