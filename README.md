# epicoraiagent
This repository contains the frontend application for Quenza AI, built using React and Vite. It integrates with the Quenza AI backend through REST APIs.

Live Frontend: https://epicoraiaagent.vercel.app

# Technology Stack

Frontend: React.js
Build Tool: Vite
HTTP Client: Axios
Styling: CSS
API Communication: REST API
Authentication: Bearer Token Authentication
Deployment: Vercel

# Installation and Setup

Prerequisites:

Node.js
npm
Git

1. Clone the Repository

git clone YOUR_GITHUB_REPOSITORY_URL

2. Navigate to the Frontend Directory

cd frontend

3. Install Dependencies

npm install

4. Configure Backend API

The frontend communicates with the backend hosted at:

https://quenzaai.com

The API uses the /v1 prefix.
The frontend supports the following environment variable:

VITE_QUENZA_API_BASE_URL=https://quenzaai.com

The API service appends /v1 automatically.

5. Start the Development Server

npm run dev

The application will be available at:
http://localhost:5173

6. Build for Production
npm run build

To preview the production build locally:
npm run preview

