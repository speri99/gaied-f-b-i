import { DynamoDBService } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Verify required environment variables
const requiredEnvVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const dynamoDB = new DynamoDBService();
const TABLE_NAME = "GEO-WebsiteTemplates";

async function createDefaultTemplate(tenantId: string) {
  const defaultTemplate = {
    id: uuidv4(),
    tenantId,
    name: "Default Template",
    description: "A clean, responsive default template for new websites",
    type: "custom",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Default Template</title>
    <style>
        :root {
            --primary-color: #2563eb;
            --text-color: #1f2937;
            --background-color: #ffffff;
            --secondary-background: #f3f4f6;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        header {
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 0;
            margin-bottom: 2rem;
        }

        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: bold;
        }

        .nav-links {
            display: flex;
            gap: 1.5rem;
        }

        .nav-links a {
            color: white;
            text-decoration: none;
            transition: opacity 0.2s;
        }

        .nav-links a:hover {
            opacity: 0.8;
        }

        main {
            padding: 2rem 0;
        }

        .hero {
            text-align: center;
            padding: 4rem 0;
            background-color: var(--secondary-background);
            border-radius: 0.5rem;
            margin-bottom: 2rem;
        }

        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .hero p {
            font-size: 1.25rem;
            color: #4b5563;
            max-width: 600px;
            margin: 0 auto;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .feature-card {
            padding: 1.5rem;
            background-color: var(--secondary-background);
            border-radius: 0.5rem;
        }

        .feature-card h3 {
            margin-bottom: 1rem;
            color: var(--primary-color);
        }

        footer {
            background-color: var(--secondary-background);
            padding: 2rem 0;
            margin-top: 4rem;
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }

            .hero h1 {
                font-size: 2rem;
            }

            .footer-content {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav class="container">
            <div class="logo">Your Logo</div>
            <div class="nav-links">
                <a href="#home">Home</a>
                <a href="#about">About</a>
                <a href="#services">Services</a>
                <a href="#contact">Contact</a>
            </div>
        </nav>
    </header>

    <main class="container">
        <section class="hero">
            <h1>Welcome to Your Website</h1>
            <p>A clean, modern, and responsive template that works great on all devices.</p>
        </section>

        <section class="features">
            <div class="feature-card">
                <h3>Feature 1</h3>
                <p>Description of your first main feature or service offering.</p>
            </div>
            <div class="feature-card">
                <h3>Feature 2</h3>
                <p>Description of your second main feature or service offering.</p>
            </div>
            <div class="feature-card">
                <h3>Feature 3</h3>
                <p>Description of your third main feature or service offering.</p>
            </div>
        </section>
    </main>

    <footer>
        <div class="container footer-content">
            <div>
                <p>&copy; 2024 Your Company. All rights reserved.</p>
            </div>
            <div>
                <p>Contact: info@yourcompany.com</p>
            </div>
        </div>
    </footer>
</body>
</html>`,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await dynamoDB.put(TABLE_NAME, defaultTemplate);
    console.log(`Default template created successfully for tenant ${tenantId}`);
  } catch (error) {
    console.error("Error creating default template:", error);
    throw error;
  }
}

export { createDefaultTemplate };

// Example usage:
// Replace with your tenant ID
const tenantId = "TENANT-ID-HERE";
createDefaultTemplate(tenantId).catch(console.error); 