# How to Configure DNS for `learningaier.com`

I see from your screenshot that you are in the **Cloud Domains** section of Google Cloud Console.

## Step 1: Switch to Cloud DNS
In your screenshot, under "DNS provider", select the first option:
**🔘 Use Cloud DNS (Recommended)**

This will allow you to manage your DNS records directly within Google Cloud.

## Step 2: Create a Zone (If prompted)
If it asks you to create a zone:
1.  **Zone name:** `learningaier-zone` (or similar)
2.  **DNS name:** `learningaier.com`
3.  **Description:** `Main zone for learningaier.com`
4.  Click **Create**.

## Step 3: Add the A Record
Once the zone is created (or if it already exists), you will see a list of records. Click **+ ADD RECORD SET**.

1.  **DNS Name:** Enter `api` in the box (so the full name becomes `api.learningaier.com`).
2.  **Resource Record Type:** Select `A`.
3.  **TTL:** Leave as default (e.g., `300` or `5m`).
4.  **IPv4 Address:** Enter `34.107.223.8` (The static IP I reserved for you).
5.  Click **Create**.

## Step 4: Verify
After a few minutes, you can verify it works by running this in your terminal:
```bash
host api.learningaier.com
```
It should return `34.107.223.8`.
