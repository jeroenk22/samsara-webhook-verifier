# Webhook Handler Configuratie

Dit project ontvangt requests van Samsara en stuurt ze door naar Make.com of IFTTT, afhankelijk van de ingestelde configuratie.

## Configuratie

### 1. **`.env` bestand**

In dit bestand worden de omgevingsvariabelen opgeslagen:

- `MAKE_WEBHOOK_URL`: De webhook URL voor Make.com.
- `IFTTT_WEBHOOK_URL`: De webhook URL voor IFTTT.
- `SECRET_KEY`: De geheime sleutel van Samsare voor het verifiëren van inkomende verzoeken.

**Voorbeeld van `.env` bestand:**

### 2. **`config.json` bestand**

In dit bestand kun je kiezen welke webhook(s) gebruikt moeten worden:

- **`"make"`**: Alleen Make.com webhook gebruiken.
- **`"ifttt"`**: Alleen IFTTT webhook gebruiken.
- **`"both"`**: Beide webhooks gebruiken.

**Voorbeeld van `config.json`:**

```json
{
  "webhookChoice": "both"
}
```
