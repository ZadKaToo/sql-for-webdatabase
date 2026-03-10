const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

const pool = mysql.createPool({
  host: 'db',
  user: 'root',
  password: 'root_password',
  database: 'my_web_db'
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. นำเข้าและตั้งค่า Session (ใส่ไว้ส่วนบนสุดของไฟล์ ถัดจากประกาศตัวแปร app)
const session = require('express-session');
app.use(session({
    secret: 'my_ums_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Middleware สำหรับเช็คว่า Login หรือยัง
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// 1. หน้า LMS
app.get('/lms', async (req, res) => {
  try {
    const [assignments] = await pool.query(`
      SELECT sa.AssName, s.SubjName, sa.Dateline, sa.Score, IFNULL(ans.Status, 'ยังไม่ส่ง') as Status
      FROM StdAssignment sa
      JOIN Subject s ON sa.SubjCode = s.SubjCode
      LEFT JOIN AssignScore ans ON sa.AssignID = ans.AssignID
      ORDER BY sa.Dateline ASC
    `);
    const [courseGrades] = await pool.query(`
      SELECT s.SubjCode, s.SubjName, s.SubjCredit, g.GradeResult
      FROM Grade g
      JOIN StudyRegister sr ON g.StuRegisID = sr.StuRegisID
      JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
      JOIN Subject s ON ta.SubjCode = s.SubjCode
    `);
    // ส่งตัวแปร page ไปด้วย
    res.render('lms', { assignments, courseGrades, page: 'lms' });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// 2. หน้า Registration
app.get('/registration', async (req, res) => {
  try {
    const studentId = 10001; 
    const [availableCourses] = await pool.query(`
      SELECT 
        ta.TAssignID, s.SubjCode, s.SubjName, s.SubjCredit,
        CONCAT(t.TFName, ' ', t.TLName) AS TeacherName,
        ta.StudyDay, ta.StartTime, ta.EndTime, ta.Room
      FROM TeachAssignment ta
      JOIN Subject s ON ta.SubjCode = s.SubjCode
      JOIN Teacher t ON ta.TID = t.TID
      WHERE ta.TAssignID NOT IN (
          SELECT TAssignID FROM StudyRegister WHERE UserID = ?
      )
      ORDER BY s.SubjCode ASC
    `, [studentId]);

    const [myCourses] = await pool.query(`
      SELECT 
        sr.StuRegisID, ta.TAssignID, s.SubjCode, s.SubjName, s.SubjCredit,
        ta.StudyDay, ta.StartTime, ta.EndTime, sr.StuRegisStatus
      FROM StudyRegister sr
      JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
      JOIN Subject s ON ta.SubjCode = s.SubjCode
      WHERE sr.UserID = ?
    `, [studentId]);

    // 🌟 เพิ่มใหม่: ดึงข้อมูลจำนวนงาน(ภาระงาน) ของแต่ละวิชา
    const [workloads] = await pool.query('SELECT * FROM v_subject_workload');

    let totalCredits = myCourses.reduce((sum, course) => sum + course.SubjCredit, 0);
    
    // ส่ง workloads ไปด้วย
    res.render('registration', { availableCourses, myCourses, totalCredits, workloads, page: 'registration' });
  } catch (err) {
    res.status(500).send("Registration System Error: " + err.message);
  }
});

// 3. หน้า Events
app.get('/events', async (req, res) => {
  try {
    const studentId = 10001;
    const [events] = await pool.query(`
      SELECT 
        e.EventID, e.EventName, e.EventStartDate, e.EventEndDate, e.EventType,
        CASE WHEN r.RegID IS NOT NULL THEN 1 ELSE 0 END AS IsRegistered
      FROM Event e
      LEFT JOIN Register r ON e.EventID = r.EventID AND r.UserID = ?
      ORDER BY e.EventStartDate ASC
    `, [studentId]);

    const upcomingEvents = events.filter(e => e.IsRegistered === 0);
    const myEvents = events.filter(e => e.IsRegistered === 1);
    // ส่งตัวแปร page ไปด้วย
    res.render('events', { upcomingEvents, myEvents, page: 'events' });
  } catch (err) {
    res.status(500).send("Event System Error: " + err.message);
  }
});

// 4. หน้า Academic
app.get('/academic', async (req, res) => {
  try {
    const [curriculum] = await pool.query(`
      SELECT f.FNameENG as Faculty, m.MjNameENG as Major 
      FROM Fact f JOIN Major m ON f.FCode = m.FCode
    `);
    const [schedules] = await pool.query(`
      SELECT 
        ta.TAssignID, CONCAT(t.TFName, ' ', t.TLName) as TeacherName,
        s.SubjName, ta.StudyDay, ta.StartTime, ta.EndTime, ta.Room
      FROM TeachAssignment ta
      JOIN Teacher t ON ta.TID = t.TID
      JOIN Subject s ON ta.SubjCode = s.SubjCode
      ORDER BY FIELD(ta.StudyDay, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), ta.StartTime
    `);
    // ส่งตัวแปร page ไปด้วย
    res.render('academic', { curriculum, schedules, page: 'academic' });
  } catch (err) {
    res.status(500).send("Academic Data Error: " + err.message);
  }
});

// 5. หน้า Evaluation
app.get('/evaluation', async (req, res) => {
  try {
    const studentId = 10001; 
    const [pendingReviews] = await pool.query(`
      SELECT DISTINCT
        sa.AssignID, sa.AssName, s.SubjName,
        CONCAT(t.TFName, ' ', t.TLName) AS TeacherName
      FROM AssignScore ans
      JOIN StdAssignment sa ON ans.AssignID = sa.AssignID
      JOIN Subject s ON sa.SubjCode = s.SubjCode
      JOIN TeachAssignment ta ON s.SubjCode = ta.SubjCode
      JOIN Teacher t ON ta.TID = t.TID
      WHERE ans.UserID = ? 
        AND ans.Status = 'SUBMITTED'
        AND sa.AssignID NOT IN (SELECT AssignID FROM ReviewTeacher WHERE UserID = ?)
    `, [studentId, studentId]);

    const [myReviews] = await pool.query(`
      SELECT DISTINCT
        rt.TeachReview, rt.UserRateT, rt.UserReviewT, sa.AssName, s.SubjName,
        CONCAT(t.TFName, ' ', t.TLName) AS TeacherName
      FROM ReviewTeacher rt
      JOIN StdAssignment sa ON rt.AssignID = sa.AssignID
      JOIN Subject s ON sa.SubjCode = s.SubjCode
      JOIN TeachAssignment ta ON s.SubjCode = ta.SubjCode
      JOIN Teacher t ON ta.TID = t.TID
      WHERE rt.UserID = ?
    `, [studentId]);

    // 🌟 เพิ่มใหม่: ดึงคะแนนประเมินเฉลี่ยของอาจารย์ทั้งหมด
    const [teacherReviews] = await pool.query('SELECT * FROM v_teacher_reviews ORDER BY AvgRating DESC');

    // ส่ง teacherReviews ไปด้วย
    res.render('evaluation', { pendingReviews, myReviews, teacherReviews, page: 'evaluation' });
  } catch (err) {
    res.status(500).send("Evaluation System Error: " + err.message);
  }
});

// 6. หน้า Dashboard (หน้าหลัก)
app.get('/', async (req, res) => {
  try {
    const [
      [gpa], [schedule], [pending], [dashboard], 
      [credits], [workload], [reviews], [facStats],[facultyStats]
    ] = await Promise.all([
      pool.query('SELECT * FROM v_student_gpa'),
      pool.query('SELECT * FROM student_daily_schedule'),
      pool.query('SELECT * FROM student_pending_assignments'),
      pool.query('SELECT * FROM v_student_dashboard'),
      pool.query('SELECT * FROM v_student_credits'),
      pool.query('SELECT * FROM v_subject_workload'),
      pool.query('SELECT * FROM v_teacher_reviews'),
      pool.query('SELECT * FROM v_faculty_stats'),
      pool.query('SELECT * FROM v_faculty_stats ORDER BY TotalStudents DESC')
    ]);
    // ส่งตัวแปร page ไปด้วย
    res.render('index', { 
      gpa, schedule, pending, dashboard, 
      credits, workload, reviews, facStats,facultyStats,
      page: 'dashboard'
    });
  } catch (err) {
    res.status(500).send("Database Error: " + err.message);
  }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// ประมวลผล Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM UserInfo WHERE UserEmail = ? AND UserPass = ?', [email, password]);
        if (users.length > 0) {
            req.session.user = users[0]; // บันทึกข้อมูลลง Session
            res.redirect('/'); // กลับไปหน้า Dashboard
        } else {
            res.render('login', { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง!' });
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// หน้าจอ Register
app.get('/register', (req, res) => {
    res.render('register');
});

// ประมวลผล Register (INSERT ลงตาราง UserInfo)
app.post('/register', async (req, res) => {
    const { UserID, UserFName, UserLName, UserEmail, UserPass } = req.body;
    try {
        // ให้ UserType เริ่มต้นเป็น 'STD' (นักศึกษา)
        await pool.query(
            'INSERT INTO UserInfo (UserID, UserFName, UserLName, UserEmail, UserPass, UserType) VALUES (?, ?, ?, ?, ?, "STD")',
            [UserID, UserFName, UserLName, UserEmail, UserPass]
        );
        res.redirect('/login'); // สมัครเสร็จให้ไปหน้า Login
    } catch (err) {
        res.send("เกิดข้อผิดพลาดในการสมัคร: " + err.message);
    }
});

// ระบบ Logout
app.get('/logout', (req, res) => {
    req.session.destroy(); // ล้าง Session
    res.redirect('/login');
});

// ==========================================
// 🚀 ROUTE: Settings (อัปเดตข้อมูลส่วนตัว)
// ==========================================

app.get('/settings', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        // ดึงข้อมูลจาก View ที่เราเพิ่งสร้าง
        const [profile] = await pool.query('SELECT * FROM v_user_profile WHERE UserID = ?', [userId]);
        res.render('settings', { user: profile[0], success: false });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/settings', requireLogin, async (req, res) => {
    const userId = req.session.user.UserID;
    const { UserFName, UserLName, UserPass } = req.body;
    try {
        await pool.query(
            'UPDATE UserInfo SET UserFName = ?, UserLName = ?, UserPass = ? WHERE UserID = ?',
            [UserFName, UserLName, UserPass, userId]
        );
        // อัปเดตข้อมูลเสร็จ ดึงข้อมูลมาแสดงใหม่พร้อมข้อความสำเร็จ
        const [profile] = await pool.query('SELECT * FROM v_user_profile WHERE UserID = ?', [userId]);
        res.render('settings', { user: profile[0], success: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(80, () => console.log('Admin & Student Portal Live!'));