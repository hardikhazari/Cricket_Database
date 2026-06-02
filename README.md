# CricPulse a cricket Web Application

CricPulse is a full-stack web application designed to showcase structured cricket data, including global rankings, comprehensive player statistics, team profiles, and upcoming match schedules. It features a secure user authentication system, automated email workflows, and a robust MySQL-backed REST API to dynamically serve content to the frontend.

--- 

## Key Features

- **Dedicated Detail Pages**: Dedicated views for teams, players, and series, complete with detailed statistics and intelligent data filters.
- **Multi-Format Rankings**: Real-time support for Test, ODI, and T20 rankings for both individual players and international teams.
- **Match Schedule Viewer**: An interactive schedule allowing users to explore upcoming and past matches sorted by series or major tournaments.
- **User Authentication**:
  - A secure manual login and signup system.
  - Google OAuth Sign-In integration (with secure backend token verification using the google-auth-library).
- **Email Workflows**:
  - Automated login confirmation emails.
  - Instant subscription and payment confirmation receipts.
- **REST API Endpoints**:
  - Organized endpoints delivering data for rankings, squad rosters, series, tournaments, and match schedules.

---

## Tech Stack

| Layer         | Technology                                    |
|---------------|-----------------------------------------------|
| **Frontend**  | HTML, CSS, JavaScript                         |
| **Backend**   | Node.js, Express                              |
| **Database**  | MySQL (normalized schema, manually curated)   |
| **Email**     | Nodemailer (Gmail SMTP)                       |
| **Auth**      | Google OAuth + Manual Login (JWT token validation) |

---

## Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/hardikhazari/cricpulse_app.git
cd cricpulse_app
```

### 2. Folder Structure
```text
cricpulse_app/
├── client/                  # Frontend Application
│   ├── index.html           # Homepage & News Updates
│   ├── login.html           # Authentication (Login)
│   ├── signup.html          # Authentication (Registration)
│   ├── matches.html         # Match schedules & scores
│   ├── profile.html         # User dashboard
│   ├── rankings.html        # Global cricket rankings
│   ├── series.html          # Bilateral series & tournaments
│   ├── squad.html           # Team rosters
│   ├── subscription.html    # Premium subscription & payments
│   └── styles.css           # Global application styling
│
├── server/                  # Backend Node.js Environment
│   ├── server.js            # Express server, routes & logic
│   ├── schema.sql           # Database schema & stored procedures
│   └── package.json         # Backend dependencies
│
├── Photos/                  # Project assets & screenshots
└── README.md                # Project documentation
```

### 3. Install Backend Dependencies
```bash
cd server
npm install
```

## Screenshots

![Screenshot 7](Photos/Screenshot%202026-06-02%20191935.png)
![Screenshot 1](Photos/Screenshot%202026-06-02%20191454.png)
![Screenshot 2](Photos/Screenshot%202026-06-02%20191508.png)
![Screenshot 3](Photos/Screenshot%202026-06-02%20191522.png)
![Screenshot 4](Photos/Screenshot%202026-06-02%20191537.png)
![Screenshot 5](Photos/Screenshot%202026-06-02%20191554.png)
![Screenshot 6](Photos/Screenshot%202026-06-02%20191621.png)
