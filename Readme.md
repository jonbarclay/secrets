Recommended Tech Stack
• Backend: Python (FastAPI). It is modern, high-performance, and has excellent built-in data validation (Pydantic) which is crucial for input sanitization.
• Database: Redis. This is ideal for this specific use case because Redis supports Time-To-Live (TTL) natively. You don't need to write cron jobs to delete old secrets; Redis will automatically vaporize them when the time is up.
• Frontend: React + Tailwind CSS. This ensures the "modern, attractive, and responsive" requirement.
• Container: Docker Compose (to bundle the App and Redis).
Phase 1: The Architectural Plan
Before generating code, here is the logic flow we will enforce to ensure security and solve the "Slack Link Preview" issue:
1. Encryption: Secrets are encrypted before they are saved to Redis. The server stores the encrypted blob.
2. The "Preview" Problem: When a link is generated, it does not automatically return the data. It loads a frontend page asking for the password (default: "uvu").
3. Destruction:
• If Time-based: Redis TTL handles it.
• If One-time view: The API endpoint that fetches the secret triggers a DELETE command immediately after serving the response.
