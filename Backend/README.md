# UrbanSpire AI — Backend

Complete production-ready backend for the UrbanSpire AI Smart Municipal Governance Platform.

## 📁 Folder Structure

```
urbanspire-backend/
├── server.js                 # App entry point
├── package.json
├── .env.example               # copy to .env and fill in your values
├── .gitignore
├── config/
│   └── db.js                  # MongoDB Atlas connection
├── models/
│   ├── User.js
│   ├── Complaint.js
│   ├── Department.js
│   ├── Notification.js
│   └── Certificate.js
├── controllers/
│   ├── authController.js
│   ├── complaintController.js
│   ├── chatbotController.js
│   ├── certificateController.js
│   ├── dashboardController.js
│   └── notificationController.js
├── routes/
│   ├── authRoutes.js
│   ├── complaintRoutes.js
│   ├── chatbotRoutes.js
│   ├── certificateRoutes.js
│   ├── dashboardRoutes.js
│   └── notificationRoutes.js
├── middleware/
│   ├── authMiddleware.js       # JWT protect + role authorize + optionalAuth
│   ├── errorMiddleware.js
│   ├── validateMiddleware.js
│   └── upload.js                # multer file upload config
├── services/
│   ├── geminiService.js         # Google Gemini API integration
│   ├── classificationService.js # AI complaint classification
│   └── pdfService.js            # Certificate PDF generation
├── utils/
│   ├── generateToken.js
│   ├── generateId.js
│   ├── validators.js
│   └── seedDepartments.js       # run once to create initial data
└── uploads/
    ├── complaints/               # uploaded complaint photos
    └── certificates/             # uploaded ID proofs + generated PDFs
```

---

## 🚀 Step 1 — Local Setup

1. Install [Node.js](https://nodejs.org) (v18 or higher) if you don't have it.
2. Open this folder in VS Code.
3. Open a terminal in VS Code (`Ctrl + \``) and run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
5. Fill in the values inside `.env` (see Step 2 and Step 3 below for how to get them).
6. Start the server:
   ```bash
   npm run dev
   ```
7. You should see:
   ```
   ✅ MongoDB Connected: ...
   ✅ UrbanSpire AI backend running on port 5000
   ```
8. Test it's working by opening `http://localhost:5000` in your browser — you should see a JSON success message.

---

## 🍃 Step 2 — MongoDB Atlas Setup (Free)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a **free M0 cluster**.
3. Go to **Database Access** → Add a new database user (remember the username & password).
4. Go to **Network Access** → Add IP Address → choose **Allow Access from Anywhere** (`0.0.0.0/0`) — needed so Render can connect.
5. Go to **Database → Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Paste it into your `.env` as `MONGO_URI`, replacing `<username>` and `<password>` with your actual values, and add `/urbanspire` before the `?` so it connects to a database named "urbanspire":
   ```
   MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/urbanspire?retryWrites=true&w=majority
   ```

### ⚠️ If you get a DNS / connection error (`querySrv ENOTFOUND`)
This is the most common beginner issue. Try these fixes in order:
1. Double check there are no extra spaces, quotes, or leftover `<>` brackets in `MONGO_URI`.
2. Confirm Network Access allows `0.0.0.0/0` (see step 4 above).
3. Try switching your computer's DNS to Google DNS (`8.8.8.8`) in your WiFi settings — college/office WiFi often blocks the SRV DNS lookup.
4. As a guaranteed fix: in Atlas → Connect → Drivers, there's usually also an option for the "standard" connection string (starts with `mongodb://` and lists multiple hosts) instead of `mongodb+srv://`. This skips the DNS SRV lookup entirely.
5. `config/db.js` already forces IPv4 (`family: 4`) which fixes most cloud-hosting DNS issues automatically.

---

## 🤖 Step 3 — Google Gemini API Key (Free)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.
3. Copy the key and paste it into `.env` as `GEMINI_API_KEY`.
4. That's it — the chatbot (`/api/chatbot`) will now use real Gemini AI. If the key is missing or Gemini is temporarily down, the API automatically falls back to built-in rule-based replies so your demo never breaks.

---

## 🌱 Step 4 — Seed Initial Data (optional but recommended)

This creates 7 default departments plus one test officer and one test admin account so you can log in immediately without manually creating accounts:

```bash
npm run seed
```

This will print test credentials like:
```
officer@urbanspire.ai / officer123
admin@urbanspire.ai / admin123
```

---

## 📡 Step 5 — API Endpoints Reference

| Method | Endpoint                                  | Access          | Description |
|--------|--------------------------------------------|-----------------|--------------|
| POST   | `/api/auth/signup`                         | Public          | Citizen signup |
| POST   | `/api/auth/login`                          | Public          | Citizen login |
| POST   | `/api/auth/officer-login`                  | Public          | Officer/Admin login |
| GET    | `/api/auth/me`                             | Private         | Get logged-in user profile |
| POST   | `/api/complaints`                          | Public/Optional | Register complaint (multipart form, field `images`, max 3) |
| GET    | `/api/complaints/track/:complaintId`       | Public          | Track complaint by ID |
| GET    | `/api/complaints/my`                       | Citizen         | My complaints |
| GET    | `/api/complaints`                          | Officer/Admin   | All complaints (filters: `status`, `category`, `department`) |
| PUT    | `/api/complaints/:id/status`               | Officer/Admin   | Update status / assign officer |
| POST   | `/api/chatbot`                             | Public          | `{ message, lang }` → AI reply (`lang`: en/hi/mr) |
| POST   | `/api/certificates`                        | Public/Optional | Apply for document (multipart, fields `idProof`, `supportingDoc`) |
| GET    | `/api/certificates/my`                     | Citizen         | My applications |
| GET    | `/api/certificates`                        | Officer/Admin   | All applications |
| PUT    | `/api/certificates/:id/review`             | Officer/Admin   | Approve/reject (generates PDF) |
| GET    | `/api/certificates/:certificateId/download`| Public          | Download certificate PDF |
| GET    | `/api/dashboard/complaint-stats`           | Officer/Admin   | Complaint counts & breakdowns |
| GET    | `/api/dashboard/monthly-report`            | Officer/Admin   | 6-month trend |
| GET    | `/api/dashboard/officer-stats`             | Admin           | Officer performance |
| GET    | `/api/dashboard/citizen-stats`             | Admin           | Citizen engagement |
| GET    | `/api/notifications`                       | Private         | My notifications |

All Private routes need header: `Authorization: Bearer <token>` (token returned from login).

---

## 🔌 Step 6 — Connecting Your Frontend

In your frontend JavaScript, replace the mock/localStorage logic with real API calls. Example for complaint registration:

```javascript
const API_BASE = "https://your-backend-name.onrender.com/api"; // after deploying (Step 7)
// use "http://localhost:5000/api" while testing locally

async function submitComplaintToBackend(formData) {
  const data = new FormData();
  data.append('name', formData.name);
  data.append('mobile', formData.mobile);
  data.append('category', formData.category);
  data.append('address', formData.address);
  data.append('description', formData.description);
  if (formData.photoFile) data.append('images', formData.photoFile);

  const res = await fetch(`${API_BASE}/complaints`, { method: 'POST', body: data });
  return await res.json(); // { success, complaint, estimatedResolution }
}

async function askChatbot(message, lang) {
  const res = await fetch(`${API_BASE}/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, lang }),
  });
  return await res.json(); // { success, reply }
}
```

---

## ☁️ Step 7 — Deploy Backend to Render (Free)

1. Push this backend folder to a **GitHub repository** (create a new repo, e.g. `urbanspire-backend`).
2. Go to [render.com](https://render.com) → sign up/login → **New → Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Under **Environment Variables**, add every key from your `.env` file (`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL`, `NODE_ENV=production`). **Never commit your real `.env` file to GitHub.**
6. Click **Create Web Service**. Render will build and deploy — you'll get a URL like `https://urbanspire-backend.onrender.com`.
7. Update `CLIENT_URL` (in Render's environment variables) to your actual Vercel frontend URL once deployed, then update your frontend's `API_BASE` to point to this Render URL.

> ⚠️ Render's free tier "sleeps" after 15 minutes of inactivity — the first request after sleeping can take ~30-50 seconds to wake up. This is normal and fine for a hackathon demo.

---

## 🎨 Step 8 — Deploy Frontend to Vercel

1. Push your frontend `index.html` (and any other frontend files) to a separate GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import that repo.
3. Since it's a static HTML site, Vercel will auto-detect it — no build command needed.
4. Deploy. You'll get a URL like `https://urbanspire-ai.vercel.app`.
5. Go back to Render and set `CLIENT_URL` to this Vercel URL (so CORS allows it).

---

## 🧪 Quick Test Checklist

- [ ] `npm install` runs with no errors
- [ ] `.env` filled in with real MongoDB URI, JWT secret, Gemini key
- [ ] `npm run seed` successfully creates departments + test accounts
- [ ] `npm run dev` shows both "MongoDB Connected" and "backend running on port 5000"
- [ ] `POST http://localhost:5000/api/auth/signup` (via Postman/Thunder Client) creates a citizen
- [ ] `POST http://localhost:5000/api/chatbot` with `{"message":"hi","lang":"en"}` returns a reply
- [ ] `POST http://localhost:5000/api/complaints` (form-data) creates a complaint and returns a `complaintId`

You're ready to submit! 🎉
