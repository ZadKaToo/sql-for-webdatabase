const express = require('express');
const mysql = require('mysql2/promise');
const http = require('http'); // 🌟 เพิ่มใหม่: นำเข้า http module
const { Server } = require('socket.io'); // 🌟 เพิ่มใหม่: นำเข้า Socket.io

const app = express();
const server = http.createServer(app); // 🌟 เพิ่มใหม่: เอา app ไปผูกกับ http server
const io = new Server(server); // 🌟 เพิ่มใหม่: เปิดใช้งาน Socket.io

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

// 🌟 เพิ่มใหม่: ตั้งค่าการเชื่อมต่อ Socket.io
io.on('connection', (socket) => {
    console.log('🟢 มีผู้ใช้งานเชื่อมต่อ Socket (ID:', socket.id, ')');
});

// ==========================================
// 🌟 เพิ่มใหม่: หน้า Admin เพิ่มกิจกรรม (Add Event)
// ==========================================
app.get('/admin/add-event', requireLogin, (req, res) => {
    // ป้องกันนักศึกษาแอบเข้าหน้านี้
    if (req.session.user.UserType !== 'ADMIN') {
        return res.status(403).send("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }
    const isSuccess = req.query.success === 'true'; 
    res.render('admin-add-event', { success: isSuccess, page: 'events', user: req.session.user });
});

// ==========================================
// Route สำหรับรับค่าเมื่อกด "+ ลงทะเบียน" กิจกรรม
// ==========================================
app.post('/register-event', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        const { eventId } = req.body;
        
        // สร้าง RegID แบบสุ่ม เช่น R123456789 (ต้องไม่เกิน 10 ตัวอักษรตาม Schema)
        const regId = 'R' + Math.floor(100000000 + Math.random() * 900000000).toString(); 

        // บันทึกลงตาราง Register
        await pool.query(
            `INSERT INTO Register (RegID, UserID, EventID) VALUES (?, ?, ?)`, 
            [regId, userId, eventId]
        );
        
        res.redirect('/events?status=registered');
    } catch (err) {
        console.error("Event Register Error:", err);
        res.redirect('/events?status=error');
    }
});

// ==========================================
// Route สำหรับรับค่าเมื่อกด "ยกเลิก" การลงทะเบียน
// ==========================================
app.post('/cancel-event', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        const { eventId } = req.body;

        // ลบข้อมูลออกจากตาราง Register
        await pool.query(
            `DELETE FROM Register WHERE UserID = ? AND EventID = ?`, 
            [userId, eventId]
        );
        
        res.redirect('/events?status=canceled');
    } catch (err) {
        console.error("Event Cancel Error:", err);
        res.redirect('/events?status=error');
    }
});

app.post('/admin/add-event', requireLogin, async (req, res) => {
    // เช็คสิทธิ์แอดมิน
    if (req.session.user.UserType !== 'ADMIN') {
        return res.status(403).send("คุณไม่มีสิทธิ์ทำรายการนี้");
    }
    
    const { EventName, EventType, EventStartDate, EventEndDate } = req.body;
    
    try {
        // 🌟 1. หา EventID ที่ค่ามากที่สุดในฐานข้อมูล
        const [rows] = await pool.query('SELECT MAX(EventID) as maxId FROM Event');
        let newEventID = 'E001'; // กำหนดค่าเริ่มต้น ถ้าตารางนี้ยังไม่เคยมีข้อมูลเลย

        if (rows[0].maxId) {
            let currentMaxId = rows[0].maxId; // สมมติว่าได้ 'E001' มา
            
            // ตรวจสอบว่า ID ปัจจุบันเป็นตัวอักษรผสมตัวเลข (เช่น E001) หรือตัวเลขล้วน
            let numPart = parseInt(currentMaxId.substring(1)); // ตัดตัวอักษรตัวแรกออก แล้วแปลงเป็นตัวเลข
            
            if (!isNaN(numPart)) {
                // ถ้าเป็นรูปแบบ E001 -> ให้เอาตัวเลขมา +1 แล้วเติม 0 ให้ครบ 3 หลัก (กลายเป็น E002)
                newEventID = 'E' + (numPart + 1).toString().padStart(3, '0'); 
            } else {
                // กรณีถ้าของเดิมคุณใช้ตัวเลขล้วนๆ 4 หลัก (เช่น 1000)
                newEventID = (parseInt(currentMaxId) + 1).toString().padStart(4, '0');
            }
        }

        // 🌟 2. บันทึกข้อมูลลง Database พร้อม ID ที่สร้างขึ้นมาใหม่
        const sql = `INSERT INTO Event (EventID, EventName, EventType, EventStartDate, EventEndDate) VALUES (?, ?, ?, ?, ?)`;
        await pool.query(sql, [newEventID, EventName, EventType, EventStartDate, EventEndDate]);
        
        // 🌟 3. สั่งให้ Socket.io แจ้งเตือนนักศึกษา
        io.emit('new_event_alert', { 
            name: EventName, 
            type: EventType 
        });

        res.redirect('/admin/add-event?success=true');
    } catch (error) {
        console.error("Error inserting event:", error);
        res.status(500).send("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
    }
});

// ==========================================
// 1. หน้า LMS (การบ้าน & เกรด)
// ==========================================
app.get('/lms', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const isAdmin = user.UserType === 'ADMIN';
    const params = isAdmin ? [] : [user.UserID];

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

    // 🌟 ดึงสถานะว่านักศึกษาคนนี้กดยืนยัน (ล็อค) หรือยัง?
    const [statusRows] = await pool.query('SELECT Status FROM RegistrationStatus WHERE UserID = ?', [userId]);
    const isConfirmed = statusRows.length > 0 && statusRows[0].Status === 'CONFIRMED';

    const [availableCourses] = await pool.query(
      `SELECT * FROM v_course_details WHERE TAssignID NOT IN (SELECT TAssignID FROM StudyRegister WHERE UserID = ?) ORDER BY SubjCode ASC`, 
      [userId]
    );
    const [myCourses] = await pool.query(`SELECT * FROM v_student_registered_courses WHERE UserID = ?`, [userId]);
    const [workloads] = await pool.query('SELECT * FROM v_subject_workload');
    
    let totalCredits = myCourses.reduce((sum, course) => sum + course.SubjCredit, 0);
    
    res.render('registration', { 
        availableCourses, 
        myCourses, 
        totalCredits, 
        workloads, 
        isConfirmed, // 🌟 ส่งตัวแปรนี้ไปซ่อนปุ่มที่หน้าเว็บ
        page: 'registration', 
        user: req.session.user 
    });
  } catch (err) { res.status(500).send("Registration System Error: " + err.message); }
});

// ==========================================
// 2. Route รับค่าตอนกด "ยืนยันการลงทะเบียน"
// ==========================================
app.post('/confirm-registration', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        
        // บันทึกสถานะว่า 'CONFIRMED' ลง Database
        await pool.query(`
            INSERT INTO RegistrationStatus (UserID, Status) 
            VALUES (?, 'CONFIRMED') 
            ON DUPLICATE KEY UPDATE Status = 'CONFIRMED'
        `, [userId]);
        
        res.redirect('/registration?status=locked');
    } catch (err) {
        console.error("Confirm Error:", err);
        res.redirect('/registration?status=error');
    }
});

// ==========================================
// 3. Route สำหรับกด "+ เพิ่มวิชา"
// ==========================================
app.post('/add-course', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        const { tAssignID } = req.body;

        // เช็คว่ากดยืนยันหรือยัง
        const [statusRows] = await pool.query('SELECT Status FROM RegistrationStatus WHERE UserID = ?', [userId]);
        if (statusRows.length > 0 && statusRows[0].Status === 'CONFIRMED') {
            return res.redirect('/registration?status=locked');
        }

        // 🌟 แก้ไข: หา StuRegisID ล่าสุดแล้ว +1 (เพราะตารางของคุณเป็น INT แบบไม่ได้ตั้ง Auto Increment)
        const [maxIdRows] = await pool.query('SELECT MAX(StuRegisID) as maxId FROM StudyRegister');
        let newStuRegisID = 501; // ค่าเริ่มต้นถ้าตารางยังว่างอยู่ (อิงจาก mock data ของคุณ)
        
        if (maxIdRows[0].maxId) {
            newStuRegisID = maxIdRows[0].maxId + 1;
        }

        // 🌟 แก้ไข: เพิ่ม Section เป็น 1 และ สถานะเป็น 'ENROLLED' ตามโครงสร้างฐานข้อมูล
        await pool.query(
            `INSERT INTO StudyRegister (StuRegisID, TAssignID, UserID, Section, StuRegisStatus) VALUES (?, ?, ?, ?, ?)`, 
            [newStuRegisID, tAssignID, userId, 1, 'ENROLLED']
        );
        
        res.redirect('/registration?status=added');
    } catch (err) {
        console.error("Add Course Error:", err);
        res.redirect('/registration?status=error');
    }
});

// ==========================================
// 4. Route สำหรับกด "กากบาทลบวิชา"
// ==========================================
app.post('/remove-course', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.UserID;
        const { stuRegisID } = req.body; 

        // เช็คก่อนว่ากดยืนยัน (ล็อค) ไปหรือยัง
        const [statusRows] = await pool.query('SELECT Status FROM RegistrationStatus WHERE UserID = ?', [userId]);
        if (statusRows.length > 0 && statusRows[0].Status === 'CONFIRMED') {
            return res.redirect('/registration?status=locked');
        }

        // ลบวิชาออกจากตาราง StudyRegister
        // หมายเหตุ: อิงตามค่า name="stuRegisID" ที่ส่งมาจากหน้า EJS
        await pool.query(`DELETE FROM StudyRegister WHERE StuRegisID = ? AND UserID = ?`, [stuRegisID, userId]);
        
        res.redirect('/registration?status=removed');
    } catch (err) {
        console.error("Remove Course Error:", err);
        res.redirect('/registration?status=error');
    }
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

    const gpaQuery = isAdmin ? 'SELECT ROUND(AVG(GPAX), 2) as GPAX FROM v_student_gpa' : 'SELECT * FROM v_student_gpa WHERE UserID = ?';
    const scheduleQuery = isAdmin ? 'SELECT * FROM student_daily_schedule' : 'SELECT * FROM student_daily_schedule WHERE UserID = ?';
    const pendingQuery = isAdmin ? 'SELECT * FROM student_pending_assignments' : 'SELECT * FROM student_pending_assignments WHERE UserID = ?';
    const dashQuery = isAdmin ? 'SELECT * FROM v_student_dashboard' : 'SELECT * FROM v_student_dashboard WHERE UserID = ?';
    const creditsQuery = isAdmin ? 'SELECT SUM(TotalEnrolledCredits) as TotalEnrolledCredits FROM v_student_credits' : 'SELECT * FROM v_student_credits WHERE UserID = ?';
    
    // 🌟 ดึงกิจกรรมที่ถูกสร้างล่าสุด 1 อัน (เรียงจากวันที่สร้าง หรือวันที่เริ่มกิจกรรม)
    const latestEventQuery = 'SELECT * FROM Event ORDER BY EventID DESC LIMIT 1';
    
    const params = isAdmin ? [] : [user.UserID];

    const [
      [gpa], [schedule], [pending], [dashboard], 
      [credits], [workload], [reviews], [facultyStats],
      [latestEventRows] // 🌟 มารับค่ากิจกรรมล่าสุดตรงนี้
    ] = await Promise.all([
      pool.query(gpaQuery, params),
      pool.query(scheduleQuery, params),
      pool.query(pendingQuery, params),
      pool.query(dashQuery, params),
      pool.query(creditsQuery, params),
      pool.query('SELECT * FROM v_subject_workload'), 
      pool.query('SELECT * FROM v_teacher_reviews'),
      pool.query('SELECT * FROM v_faculty_stats ORDER BY TotalStudents DESC'),
      pool.query(latestEventQuery) // 🌟 ยิง Query กิจกรรมล่าสุด
    ]);

    // เช็คว่ามีกิจกรรมไหม ถ้ามีให้เอาตัวแรก ถ้าไม่มีให้เป็น null
    const latestEvent = latestEventRows.length > 0 ? latestEventRows[0] : null;

    res.render('index', { 
      gpa, schedule, pending, dashboard, 
      credits, workload, reviews, facStats: facultyStats, facultyStats,
      latestEvent, // 🌟 ส่งตัวแปรกิจกรรมล่าสุดไปที่หน้าเว็บ
      page: 'dashboard', user 
    });
  } catch (err) {
    res.status(500).send("Database Error: " + err.message);
  }
});

// ==========================================
// ส่วนของการ Login / Register / Settings
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

// ==========================================
// แสดงหน้าฟอร์มสมัครสมาชิก
// ==========================================
app.get('/register', async (req, res) => {
    try {
        // ดึงข้อมูลคณะและสาขาจาก Database
        const [faculties] = await pool.query('SELECT * FROM Fact');
        const [majors] = await pool.query('SELECT * FROM Major');
        
        // ส่งข้อมูลไปที่หน้า register.ejs
        res.render('register', { faculties, majors });
    } catch (err) {
        res.send("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
    }
});

// ==========================================
// รับค่าจากฟอร์มเพื่อบันทึกลง Database
// ==========================================
app.post('/register', async (req, res) => {
    // 🌟 รับค่า FCode และ MjCode เพิ่มเติมจากฟอร์ม
    const { UserID, UserFName, UserLName, UserEmail, UserPass, FCode, MjCode } = req.body;
    
    try {
        // 🌟 เพิ่ม FCode และ MjCode ลงในคำสั่ง INSERT
        await pool.query(
            `INSERT INTO UserInfo (UserID, UserFName, UserLName, UserEmail, UserPass, FCode, MjCode, UserType) 
             VALUES (?, ?, ?, ?, ?, ?, ?, "STD")`,
            [UserID, UserFName, UserLName, UserEmail, UserPass, FCode, MjCode]
        );
        res.redirect('/login');
    } catch (err) { 
        res.send("เกิดข้อผิดพลาดในการสมัคร: " + err.message); 
    }
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

// 🌟 แก้ไข: เปลี่ยนจาก app.listen เป็น server.listen 
server.listen(80, () => console.log('Admin & Student Portal Live on port 80!'));