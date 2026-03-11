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

// 1. นำเข้าและตั้งค่า Session
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

// ==========================================
// 1. หน้า LMS (การบ้าน & เกรด)
// ==========================================
app.get('/lms', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const isAdmin = user.UserType === 'ADMIN';
    const params = isAdmin ? [] : [user.UserID];

    // เรียกใช้ View แทนการ JOIN ยาวๆ
    let assignQuery = isAdmin 
      ? `SELECT sa.AssName, s.SubjName, sa.Dateline, sa.Score, IFNULL(ans.Status, 'ยังไม่ส่ง') as Status 
         FROM StdAssignment sa JOIN Subject s ON sa.SubjCode = s.SubjCode LEFT JOIN AssignScore ans ON sa.AssignID = ans.AssignID ORDER BY sa.Dateline ASC`
      : `SELECT * FROM v_student_lms_assignments WHERE UserID = ? ORDER BY Dateline ASC`;

    let gradeQuery = isAdmin 
      ? `SELECT * FROM v_student_grades` 
      : `SELECT * FROM v_student_grades WHERE UserID = ?`;

    const [assignments] = await pool.query(assignQuery, params);
    const [courseGrades] = await pool.query(gradeQuery, params);

    res.render('lms', { assignments, courseGrades, page: 'lms', user });
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// ==========================================
// 2. หน้า Registration
// ==========================================
app.get('/registration', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.UserID;

    // ใช้ View v_course_details และ v_student_registered_courses
    const [availableCourses] = await pool.query(
      `SELECT * FROM v_course_details WHERE TAssignID NOT IN (SELECT TAssignID FROM StudyRegister WHERE UserID = ?) ORDER BY SubjCode ASC`, 
      [userId]
    );
    const [myCourses] = await pool.query(`SELECT * FROM v_student_registered_courses WHERE UserID = ?`, [userId]);
    const [workloads] = await pool.query('SELECT * FROM v_subject_workload');
    
    let totalCredits = myCourses.reduce((sum, course) => sum + course.SubjCredit, 0);
    
    res.render('registration', { availableCourses, myCourses, totalCredits, workloads, page: 'registration', user: req.session.user });
  } catch (err) { res.status(500).send("Registration System Error: " + err.message); }
});

// ==========================================
// 3. หน้า Events
// ==========================================
app.get('/events', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.UserID;
    const [events] = await pool.query(`
      SELECT e.EventID, e.EventName, e.EventStartDate, e.EventEndDate, e.EventType,
             CASE WHEN r.RegID IS NOT NULL THEN 1 ELSE 0 END AS IsRegistered
      FROM Event e
      LEFT JOIN Register r ON e.EventID = r.EventID AND r.UserID = ?
      ORDER BY e.EventStartDate ASC
    `, [userId]);

    const upcomingEvents = events.filter(e => e.IsRegistered === 0);
    const myEvents = events.filter(e => e.IsRegistered === 1);
    const [attendees] = await pool.query('SELECT * FROM v_event_attendees');

    res.render('events', { upcomingEvents, myEvents, attendees, page: 'events', user: req.session.user });
  } catch (err) {
    res.status(500).send("Event System Error: " + err.message);
  }
});

// ==========================================
// 4. หน้า Academic (ตารางสอน/หลักสูตร)
// ==========================================
app.get('/academic', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const isAdmin = user.UserType === 'ADMIN';
    const params = isAdmin ? [] : [user.UserID];

    const [curriculum] = await pool.query(`SELECT f.FNameENG as Faculty, m.MjNameENG as Major FROM Fact f JOIN Major m ON f.FCode = m.FCode`);
    
    // Admin เห็นตารางสอนรวม (v_course_details), นศ. เห็นตารางตัวเอง (student_daily_schedule)
    let scheduleQuery = isAdmin 
      ? `SELECT * FROM v_course_details ORDER BY FIELD(StudyDay, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), StartTime`
      : `SELECT * FROM student_daily_schedule WHERE UserID = ? ORDER BY FIELD(StudyDay, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), StartTime`;

    const [schedules] = await pool.query(scheduleQuery, params);
    res.render('academic', { curriculum, schedules, page: 'academic', user });
  } catch (err) { res.status(500).send("Academic Data Error: " + err.message); }
});

// ==========================================
// 5. หน้า Evaluation
// ==========================================
app.get('/evaluation', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.UserID; 
    
    // หาว่ามีงานอะไรที่ส่งแล้วแต่ยังไม่ได้ประเมิน (อันนี้ยังต้อง JOIN เล็กน้อยเพราะเงื่อนไข NOT IN ซับซ้อน)
    const [pendingReviews] = await pool.query(`
      SELECT ans.AssignID, sa.AssName, s.SubjName, CONCAT(t.TFName, ' ', t.TLName) AS TeacherName
      FROM AssignScore ans
      JOIN StdAssignment sa ON ans.AssignID = sa.AssignID
      JOIN Subject s ON sa.SubjCode = s.SubjCode
      JOIN TeachAssignment ta ON s.SubjCode = ta.SubjCode
      JOIN Teacher t ON ta.TID = t.TID
      WHERE ans.UserID = ? AND ans.Status = 'SUBMITTED' 
        AND sa.AssignID NOT IN (SELECT AssignID FROM ReviewTeacher WHERE UserID = ?)
    `, [userId, userId]);

    // ใช้ View ดึงประวัติการประเมินที่เคยทำไปแล้ว
    const [myReviews] = await pool.query(`SELECT * FROM v_student_completed_reviews WHERE UserID = ?`, [userId]);
    const [teacherReviews] = await pool.query('SELECT * FROM v_teacher_reviews ORDER BY AvgRating DESC');

    res.render('evaluation', { pendingReviews, myReviews, teacherReviews, page: 'evaluation', user: req.session.user });
  } catch (err) { res.status(500).send("Evaluation System Error: " + err.message); }
});

// ==========================================
// 6. หน้า Dashboard (หน้าหลัก)
// ==========================================
app.get('/', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const isAdmin = user.UserType === 'ADMIN';

    // กำหนด Query ตามประเภท User
    const gpaQuery = isAdmin ? 'SELECT ROUND(AVG(GPAX), 2) as GPAX FROM v_student_gpa' : 'SELECT * FROM v_student_gpa WHERE UserID = ?';
    const scheduleQuery = isAdmin ? 'SELECT * FROM student_daily_schedule' : 'SELECT * FROM student_daily_schedule WHERE UserID = ?';
    const pendingQuery = isAdmin ? 'SELECT * FROM student_pending_assignments' : 'SELECT * FROM student_pending_assignments WHERE UserID = ?';
    const dashQuery = isAdmin ? 'SELECT * FROM v_student_dashboard' : 'SELECT * FROM v_student_dashboard WHERE UserID = ?';
    const creditsQuery = isAdmin ? 'SELECT SUM(TotalEnrolledCredits) as TotalEnrolledCredits FROM v_student_credits' : 'SELECT * FROM v_student_credits WHERE UserID = ?';
    
    const params = isAdmin ? [] : [user.UserID];

    const [
      [gpa], [schedule], [pending], [dashboard], 
      [credits], [workload], [reviews], [facultyStats]
    ] = await Promise.all([
      pool.query(gpaQuery, params),
      pool.query(scheduleQuery, params),
      pool.query(pendingQuery, params),
      pool.query(dashQuery, params),
      pool.query(creditsQuery, params),
      pool.query('SELECT * FROM v_subject_workload'), // ตารางสรุปส่วนกลาง Admin/นศ. เห็นเหมือนกัน
      pool.query('SELECT * FROM v_teacher_reviews'),
      pool.query('SELECT * FROM v_faculty_stats ORDER BY TotalStudents DESC') // แก้ Query ซ้ำให้แล้ว
    ]);

    // ส่งตัวแปร user ไปเผื่อนำไปใช้แสดงชื่อหรือปรับ UI 
    res.render('index', { 
      gpa, schedule, pending, dashboard, 
      credits, workload, reviews, facStats: facultyStats, facultyStats,
      page: 'dashboard', user 
    });
  } catch (err) {
    res.status(500).send("Database Error: " + err.message);
  }
});

// ==========================================
// ส่วนของการ Login / Register / Settings (ตามเดิม)
// ==========================================
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM UserInfo WHERE UserEmail = ? AND UserPass = ?', [email, password]);
        if (users.length > 0) {
            req.session.user = users[0]; 
            res.redirect('/');
        } else {
            res.render('login', { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง!' });
        }
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { UserID, UserFName, UserLName, UserEmail, UserPass } = req.body;
    try {
        await pool.query(
            'INSERT INTO UserInfo (UserID, UserFName, UserLName, UserEmail, UserPass, UserType) VALUES (?, ?, ?, ?, ?, "STD")',
            [UserID, UserFName, UserLName, UserEmail, UserPass]
        );
        res.redirect('/login');
    } catch (err) { res.send("เกิดข้อผิดพลาดในการสมัคร: " + err.message); }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/settings', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        const [profile] = await pool.query('SELECT * FROM v_user_profile WHERE UserID = ?', [userId]);
        res.render('settings', { user: profile[0], success: false });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/settings', requireLogin, async (req, res) => {
    const userId = req.session.user.UserID;
    const { UserFName, UserLName, UserPass } = req.body;
    try {
        await pool.query(
            'UPDATE UserInfo SET UserFName = ?, UserLName = ?, UserPass = ? WHERE UserID = ?',
            [UserFName, UserLName, UserPass, userId]
        );
        const [profile] = await pool.query('SELECT * FROM v_user_profile WHERE UserID = ?', [userId]);
        res.render('settings', { user: profile[0], success: true });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(80, () => console.log('Admin & Student Portal Live!'));