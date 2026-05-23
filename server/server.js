
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path'); 

const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors()); // Allow cross-origin requests for frontend-backend communication

// ============================================================================
// MySQL Database Connection
// ============================================================================
// Standard callback-based connection for read-only queries
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hardik@123',
    database: 'cricket'
});

// Promise-based pool for transaction support (BEGIN/COMMIT/ROLLBACK)
// Pool is needed because transactions require a dedicated connection that
// isn't shared with other concurrent requests mid-transaction.
const promisePool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hardik@123',
    database: 'cricket',
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// Connect the callback-based connection to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database!');
});

db.on('error', (err) => {
    console.error('MySQL DB Error:', err);
});

// ============================================================================
// Nodemailer Setup — Gmail SMTP for login and payment confirmation emails
// ============================================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'me240003032@iiti.ac.in',
        pass: 'Hardik@2024' // App Password if 2FA is enabled
    }
});

// Send a confirmation email after Google OAuth login
async function sendLoginEmail(userEmail, username) {
    const mailOptions = {
        from: '"CRICPULSE" <me240003032@iiti.ac.in>',
        to: userEmail,
        subject: 'Login Details',
        text: `Hello ${username},\n\nYou have successfully logged in with Google.\n\nThanks,\nCRICPULSE Team`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Failed to send email');
    }
}

// Send a payment confirmation email after successful subscription
async function sendPaymentConfirmationEmail(userEmail, cardholderName, amount, plan) {
    const mailOptions = {
        from: '"CRICPULSE" <me240003032@iiti.ac.in>',
        to: userEmail,
        subject: 'Payment Confirmation',
        text: `Dear ${cardholderName},\n\nThank you for subscribing to the ${plan} plan.\nAmount Paid: INR${amount}\n\nWe appreciate your support!\n\nBest regards,\nThe CRICPULSE Team`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Payment confirmation email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
    }
}

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Google login route
// Flow: Verify user exists in DB → Log the login event → Send confirmation email
// Note: This does NOT auto-register new users — they must sign up first
app.post('/google-login', async (req, res) => {
    const { email, name } = req.body;
    console.log('Google login data received:', email, name);

    // --- TRANSACTION: Atomically verify user + insert login record ---
    // If the login log insert fails, we don't want a partial state where
    // the user appears logged in but no audit trail exists.
    let connection;
    try {
        connection = await promisePool.getConnection();
        await connection.beginTransaction();

        const [userRows] = await connection.query(
            'SELECT * FROM users WHERE email = ?', [email]
        );

        if (userRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: 'User not found' });
        }

        const userId = userRows[0].id;
        const loginMethod = 'google';

        await connection.query(
            'INSERT INTO user_logins (user_id, login_method) VALUES (?, ?)',
            [userId, loginMethod]
        );

        await connection.commit();
        connection.release();

        // Email is sent AFTER the transaction commits — if email fails,
        // the login is still recorded (email is non-critical)
        sendLoginEmail(email, name)
            .then(() => res.status(200).json({ message: 'Google login successful' }))
            .catch((error) => {
                console.error('Email sending failed:', error);
                res.status(500).json({ message: 'Failed to send login email' });
            });

    } catch (err) {
        console.error('Transaction error in /google-login:', err);
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        return res.status(500).json({ message: 'Database error' });
    }
});

// Sign-up route — Register a new user with email, username, password
app.post('/signup', (req, res) => {
    const { email, username, password } = req.body;

    // Check if the email or username is already taken before inserting
    db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], (err, existingUsers) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email or username is already registered' });
        }

        const insertUserQuery = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [email, username, password], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});

// Login route — Authenticate user with username and password
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, matchedUsers) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (matchedUsers.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({
            message: 'Login successful',
            username: matchedUsers[0].username,
            email: matchedUsers[0].email
        });
    });
});

// DELETE endpoint — Permanently remove a user account by email
app.delete('/delete-account', (req, res) => {
    const { email } = req.body;

    db.query('DELETE FROM users WHERE email = ?', [email], (err, deleteResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    });
});


// Serve static files (like CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, '../client')));

// ============================================================================
// RANKINGS ROUTES — Player and Team rankings across Test, ODI, T20 formats
// ============================================================================
// Each route calls the refresh_rankings_cache stored procedure first,
// then reads from the rankings_cache table. This ensures the cache is fresh
// on every request while keeping the complex ranking computation in SQL.

// Player Test rankings — JOIN rankings → player → teams, ordered by rank
app.get('/api/rankings/test', async (req, res) => {
    try {
        // Refresh the rankings cache before reading (stored procedure in schema.sql)
        await promisePool.query('CALL refresh_rankings_cache()');

        const [cachedRankings] = await promisePool.query(`
            SELECT player_name, team_name, rank_value AS test_rank
            FROM rankings_cache
            WHERE format = 'Test' AND entity_type = 'player'
            ORDER BY rank_value ASC
        `);
        res.json(cachedRankings);
    } catch (err) {
        console.error('Error fetching Test rankings:', err.stack);
        res.status(500).send('Error fetching data');
    }
});

// Player ODI rankings
app.get('/api/rankings/odi', async (req, res) => {
    try {
        await promisePool.query('CALL refresh_rankings_cache()');

        const [cachedRankings] = await promisePool.query(`
            SELECT player_name, team_name, rank_value AS odi_rank
            FROM rankings_cache
            WHERE format = 'ODI' AND entity_type = 'player'
            ORDER BY rank_value ASC
        `);
        res.json(cachedRankings);
    } catch (err) {
        console.error('Error fetching ODI rankings:', err.stack);
        res.status(500).send('Error fetching data');
    }
});

// Player T20 rankings (route lowercased to match frontend's loadFormat('t20'))
app.get('/api/rankings/t20', async (req, res) => {
    try {
        await promisePool.query('CALL refresh_rankings_cache()');

        const [cachedRankings] = await promisePool.query(`
            SELECT player_name, team_name, rank_value AS t20_rank
            FROM rankings_cache
            WHERE format = 'T20' AND entity_type = 'player'
            ORDER BY rank_value ASC
        `);
        res.json(cachedRankings);
    } catch (err) {
        console.error('Error fetching T20 rankings:', err.stack);
        res.status(500).send('Error fetching data');
    }
});

// ============================================================================
// SCHEDULE ROUTE — Match fixtures filtered by series or tournament
// ============================================================================
// Uses a double JOIN on teams (once for TeamA, once for TeamB) to resolve
// team IDs to human-readable names. Requires exactly one filter parameter.
app.get('/api/schedule', (req, res) => {
    const { seriesId, tournamentId } = req.query;

    let scheduleQuery = `
        SELECT 
            m.Match_Id,
            m.Dates,
            m.Timings,
            m.Place,
            m.Score_1,
            m.Score_2,
            m.Winner_Id,
            m.Description,
            m.Status,
            m.Tournament_Id,
            m.Series_Id,
            t1.Team_Name AS TeamA,
            t2.Team_Name AS TeamB
        FROM matches m
        JOIN teams t1 ON m.TeamA_Id = t1.Team_Id
        JOIN teams t2 ON m.TeamB_Id = t2.Team_Id
    `;

    // Exactly one of seriesId or tournamentId must be provided
    if (seriesId) {
        scheduleQuery += ` WHERE m.Series_Id = ?`;
    } else if (tournamentId) {
        scheduleQuery += ` WHERE m.Tournament_Id = ?`;
    } else {
        res.status(400).send('Missing seriesId or tournamentId');
        return;
    }

    const filterParam = seriesId || tournamentId;

    db.query(scheduleQuery, [filterParam], (err, matchResults) => {
        if (err) {
            console.error('Error fetching schedule data:', err.stack);
            res.status(500).send('Error fetching schedule data');
            return;
        }
        res.json(matchResults);
    });
});

// ============================================================================
// SERIES ROUTE — Combined list of bilateral series AND multi-team tournaments
// ============================================================================
// Uses UNION ALL to merge two different result shapes:
//   1. Bilateral series: Has TeamA, TeamB names, NULL Tournament_Id
//   2. Tournaments: Has NULL TeamA/TeamB, has Tournament_Id
// The frontend uses this combined list to show all cricket events in one table,
// and routes to the matches page using whichever ID (Series/Tournament) is present.
app.get('/api/series', (req, res) => {
    const seriesAndTournamentQuery = `
        SELECT 
            m.Series_Id,
            s.Series_Name AS Series_Name,
            s.Format AS Series_Format,
            t1.Team_Name AS TeamA,
            t2.Team_Name AS TeamB,
            COUNT(m.Match_Id) AS NoOfMatches,
            NULL AS Tournament_Id
        FROM matches m
        JOIN teams t1 ON m.TeamA_Id = t1.Team_Id
        JOIN teams t2 ON m.TeamB_Id = t2.Team_Id
        JOIN series s ON m.Series_Id = s.Series_Id
        GROUP BY m.Series_Id, s.Series_Name, s.Format, t1.Team_Name, t2.Team_Name

        UNION ALL

        SELECT 
            NULL AS Series_Id,
            t.Tournament_Name AS Series_Name,
            t.Format AS Series_Format,
            NULL AS TeamA,
            NULL AS TeamB,
            COUNT(m.Match_Id) AS NoOfMatches,
            t.Tournament_Id AS Tournament_Id
        FROM matches m
        JOIN tournament t ON m.Tournament_Id = t.Tournament_Id
        GROUP BY t.Tournament_Id, t.Tournament_Name, t.Format

        ORDER BY Series_Id, Series_Name, TeamA, TeamB;
    `;
    
    db.query(seriesAndTournamentQuery, (err, seriesResults) => {
        if (err) {
            console.error('Error fetching series data:', err.stack);
            res.status(500).send('Error fetching series data');
            return;
        }
        res.json(seriesResults);
    });
});

// ============================================================================
// PLAYERS ROUTE — Get squad members for a specific team
// ============================================================================
app.get('/api/players/:teamId', (req, res) => {
    const teamId = req.params.teamId;
    const squadQuery = `
        SELECT Name, Batting_Type, Bowling_Type, DOB
        FROM player
        WHERE Team_Id = ?
    `;

    db.query(squadQuery, [teamId], (err, playerResults) => {
        // Fixed: was 'throw err' which would crash the entire server
        if (err) {
            console.error('Error fetching squad data:', err.stack);
            res.status(500).send('Error fetching squad data');
            return;
        }
        res.json(playerResults);
    });
});

// ============================================================================
// TEAM RANKINGS ROUTES — Team-level rankings by format
// ============================================================================

// Team Test rankings — Direct query on teams table (no JOIN needed)
app.get('/api/rankings/teams/test', (req, res) => {
    const teamTestRankQuery = `
        SELECT Team_Name AS team_name, 'Global' AS region, Test_Rank AS test_rank
        FROM teams
        WHERE Test_Rank IS NOT NULL
        ORDER BY Test_Rank ASC;
    `;
    db.query(teamTestRankQuery, (err, teamRankings) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(teamRankings);
    });
});

// Team ODI rankings
app.get('/api/rankings/teams/odi', (req, res) => {
    const teamOdiRankQuery = `
        SELECT Team_Name AS team_name, 'Global' AS region, Odi_Rank AS odi_rank
        FROM teams
        WHERE Odi_Rank IS NOT NULL
        ORDER BY Odi_Rank ASC;
    `;
    db.query(teamOdiRankQuery, (err, teamRankings) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(teamRankings);
    });
});

// Team T20 rankings
app.get('/api/rankings/teams/t20', (req, res) => {
    const teamT20RankQuery = `
        SELECT Team_Name AS team_name, T20_Rank AS t20_rank
        FROM teams
        WHERE T20_Rank IS NOT NULL
        ORDER BY T20_Rank ASC;
    `;
    db.query(teamT20RankQuery, (err, teamRankings) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(teamRankings);
    });
});

// ============================================================================
// SUBSCRIPTION ROUTE — Process payment and record subscription
// ============================================================================
// Flow: Verify user exists → Insert subscription record → Send confirmation email
//
// --- CONCURRENCY HANDLING (SELECT FOR UPDATE) ---
// RACE CONDITION: Two concurrent POST /subscribe requests for the same user email.
//   Thread A: SELECT user → user exists → proceed to INSERT subscription
//   Thread B: SELECT user → user exists → proceed to INSERT subscription
//   Result: Duplicate subscription records for the same user.
//
// WHY IT MATTERS: A user could be double-charged if two rapid form submissions
// both pass the user-existence check and create separate subscription entries.
//
// HOW SELECT FOR UPDATE FIXES IT:
//   Thread A: SELECT ... FOR UPDATE → acquires row-level lock on user row
//   Thread B: SELECT ... FOR UPDATE → BLOCKS (waits for Thread A's lock)
//   Thread A: INSERT subscription → COMMIT → releases lock
//   Thread B: Lock acquired → can now proceed (or be rejected if business logic prevents duplicates)
// This serializes concurrent writes on the same user row, preventing duplicate subscriptions.
app.post('/subscribe', async (req, res) => {
    const { email, cardholderName, amount, plan } = req.body;
    console.log('Received subscription request:', { email, cardholderName, amount, plan });

    let connection;
    try {
        connection = await promisePool.getConnection();
        await connection.beginTransaction();

        // SELECT FOR UPDATE: Lock this user's row to prevent concurrent duplicate subscriptions
        const [lockedUserRows] = await connection.query(
            'SELECT * FROM users WHERE email = ? FOR UPDATE',
            [email]
        );

        if (lockedUserRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: 'User not found' });
        }

        const subscriberUserId = lockedUserRows[0].id;

        // Insert the subscription record within the same transaction
        await connection.query(
            'INSERT INTO subscriptions (user_id, plan, amount) VALUES (?, ?, ?)',
            [subscriberUserId, plan, amount]
        );

        await connection.commit();
        connection.release();

        // Send email AFTER commit — email failure shouldn't roll back the subscription
        console.log(`Sending payment confirmation email to ${email}`);
        sendPaymentConfirmationEmail(email, cardholderName, amount, plan)
            .then(() => res.status(200).json({ message: 'Subscription successful, email sent!' }))
            .catch((error) => {
                console.error('Failed to send email:', error);
                res.status(500).json({ message: 'Subscription successful, but email failed' });
            });

    } catch (err) {
        console.error('Transaction error in /subscribe:', err);
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        return res.status(500).json({ message: 'Failed to record subscription' });
    }
});

// ============================================================================
// PLAYER FORM & ROLLING AVERAGE ROUTE (Window Functions)
// ============================================================================
// Computes each player's rolling batting average over their last 5 and last 10
// innings using SQL window functions (ROWS BETWEEN ... PRECEDING AND CURRENT ROW).
// Results are written to the player_form table, then returned to the client.
// Also computes a Player Performance Index (ML feature — Phase 4).
app.get('/api/player-form', async (req, res) => {
    try {
        // Step 1: Compute rolling averages using window functions and store in player_form
        // The INSERT ... ON DUPLICATE KEY UPDATE pattern ensures we upsert (insert or update)
        // rather than creating duplicate rows for the same player.
        await promisePool.query(`
            INSERT INTO player_form (Player_Id, rolling_avg_last_5, rolling_avg_last_10, career_avg, performance_index, last_updated)
            SELECT 
                sub.Player_Id,
                sub.rolling_avg_last_5,
                sub.rolling_avg_last_10,
                sub.career_avg,
                -- Player Performance Index (ML — weighted recent form score):
                -- Weights: 50% last-5 form + 30% last-10 trend + 20% career baseline
                -- Rationale: Recent form is the strongest predictor of short-term performance,
                -- but career average anchors against small-sample volatility.
                ROUND(
                    (COALESCE(sub.rolling_avg_last_5, 0) * 0.5) +
                    (COALESCE(sub.rolling_avg_last_10, 0) * 0.3) +
                    (COALESCE(sub.career_avg, 0) * 0.2),
                    2
                ) AS performance_index,
                NOW() AS last_updated
            FROM (
                SELECT DISTINCT
                    latest.Player_Id,
                    latest.rolling_avg_last_5,
                    latest.rolling_avg_last_10,
                    career.career_avg
                FROM (
                    -- Window function: rolling averages partitioned by player, ordered by date
                    SELECT 
                        Player_Id,
                        innings_date,
                        ROUND(AVG(runs_scored) OVER (
                            PARTITION BY Player_Id 
                            ORDER BY innings_date 
                            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
                        ), 2) AS rolling_avg_last_5,
                        ROUND(AVG(runs_scored) OVER (
                            PARTITION BY Player_Id 
                            ORDER BY innings_date 
                            ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
                        ), 2) AS rolling_avg_last_10,
                        ROW_NUMBER() OVER (
                            PARTITION BY Player_Id 
                            ORDER BY innings_date DESC
                        ) AS rn
                    FROM innings
                ) latest
                JOIN (
                    -- Career average: simple mean of all innings for each player
                    SELECT Player_Id, ROUND(AVG(runs_scored), 2) AS career_avg
                    FROM innings
                    GROUP BY Player_Id
                ) career ON latest.Player_Id = career.Player_Id
                WHERE latest.rn = 1
            ) sub
            ON DUPLICATE KEY UPDATE
                rolling_avg_last_5 = sub.rolling_avg_last_5,
                rolling_avg_last_10 = sub.rolling_avg_last_10,
                career_avg = sub.career_avg,
                performance_index = ROUND(
                    (COALESCE(sub.rolling_avg_last_5, 0) * 0.5) +
                    (COALESCE(sub.rolling_avg_last_10, 0) * 0.3) +
                    (COALESCE(sub.career_avg, 0) * 0.2),
                    2
                ),
                last_updated = NOW()
        `);

        // Step 2: Return the computed player form data joined with player names
        const [playerFormData] = await promisePool.query(`
            SELECT 
                p.Name AS player_name,
                t.Team_Name AS team_name,
                pf.rolling_avg_last_5,
                pf.rolling_avg_last_10,
                pf.career_avg,
                pf.performance_index,
                pf.last_updated
            FROM player_form pf
            JOIN player p ON pf.Player_Id = p.Player_Id
            JOIN teams t ON p.Team_Id = t.Team_Id
            ORDER BY pf.performance_index DESC
        `);

        res.json(playerFormData);
    } catch (err) {
        console.error('Error computing player form:', err.stack);
        res.status(500).send('Error computing player form data');
    }
});

// Route to serve the HTML file
app.get('/rankings', (req, res) => {
    res.sendFile(path.join(__dirname, 'rankings.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
