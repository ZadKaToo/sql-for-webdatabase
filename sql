-- 1. Fact Table
CREATE TABLE Fact(
    FCode       VARCHAR(4) PRIMARY KEY,
    FNameENG    VARCHAR(256),
    FNameTHA    VARCHAR(256)
);

-- 2. Major Table
CREATE TABLE Major(
    MjCode      VARCHAR(4) PRIMARY KEY,
    MjNameENG   VARCHAR(256),
    MjNameTHA   VARCHAR(256),
    FCode       VARCHAR(4),
    CONSTRAINT Major_fk_Fact FOREIGN KEY (FCode) REFERENCES Fact(FCode)
);

-- 3. Teacher Table
CREATE TABLE Teacher(
    TID         VARCHAR(4) PRIMARY KEY,
    TFName      VARCHAR(50),
    TLName      VARCHAR(50)
);

-- 4. Event Table
CREATE TABLE Event(
    EventID         VARCHAR(4) PRIMARY KEY,
    EventName       VARCHAR(150),
    EventStartDate  DATE,
    EventEndDate    DATE,
    EventType       VARCHAR(50)
);

-- 5. UserInfo Table
CREATE TABLE UserInfo(
    UserID      INT(5) PRIMARY KEY,
    UserFName   VARCHAR(50),
    UserLName   VARCHAR(50),
    UserEmail   VARCHAR(100),
    UserPass    VARCHAR(100),
    FCode       VARCHAR(4),
    MjCode      VARCHAR(4),
    UserType    VARCHAR(5),
    CONSTRAINT UserInfo_fk_Fact FOREIGN KEY (FCode) REFERENCES Fact(FCode),
    CONSTRAINT UserInfo_fk_Major FOREIGN KEY (MjCode) REFERENCES Major(MjCode)
);

-- 6. Subject Table
CREATE TABLE Subject(
    SubjCode    VARCHAR(8) PRIMARY KEY,
    SubjName    VARCHAR(100),
    SubjCredit  INT(2),
    FCode       VARCHAR(4),
    SubjType    VARCHAR(150),
    CONSTRAINT Subject_fk_fact FOREIGN KEY(FCode) REFERENCES Fact(FCode)
);

-- 7. Register Table
CREATE TABLE Register(
    RegID       VARCHAR(10) PRIMARY KEY,
    UserID      INT(5),
    EventID     VARCHAR(4),
    CONSTRAINT Register_fk_UserInfo FOREIGN KEY(UserID) REFERENCES UserInfo(UserID),
    CONSTRAINT Register_fk_Event FOREIGN KEY(EventID) REFERENCES Event(EventID)
);

-- 8. StdAssignment Table
CREATE TABLE StdAssignment(
    AssignID    VARCHAR(10) PRIMARY KEY,
    SubjCode    VARCHAR(8),
    AssName     VARCHAR(150),
    Dateline    DATE,
    Score       INT(3),
    CONSTRAINT StdAssignment_fk_Subject FOREIGN KEY (SubjCode) REFERENCES Subject(SubjCode)
);

-- 9. TeachAssignment Table
CREATE TABLE TeachAssignment(
    TAssignID  VARCHAR(5) PRIMARY KEY,
    TID        VARCHAR(4),
    SubjCode   VARCHAR(8),
    Year       INT(4),
    Semester   INT(1),
    StudyDay   VARCHAR(10),
    StartTime  VARCHAR(5),
    EndTime    VARCHAR(5),
    Room       VARCHAR(20),
    CONSTRAINT TeachAssignment_fk_Teacher FOREIGN KEY (TID) REFERENCES Teacher(TID),
    CONSTRAINT TeachAssignment_fk_SubjCode FOREIGN KEY (SubjCode) REFERENCES Subject(SubjCode),
    CONSTRAINT chk_study_day CHECK (StudyDay IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'))
);

-- 10. StudyRegister Table
CREATE TABLE StudyRegister(
    StuRegisID      INT(5) PRIMARY KEY, 
    TAssignID       VARCHAR(5),
    UserID          INT(5),
    Section         INT(3), 
    StuRegisStatus  VARCHAR(15),
    CONSTRAINT StudyRegister_fk_TeachAssignment FOREIGN KEY (TAssignID) REFERENCES TeachAssignment(TAssignID),
    CONSTRAINT StudyRegister_fk_UserInfo FOREIGN KEY (UserID) REFERENCES UserInfo(UserID)
);

-- 11. Grade Table
CREATE TABLE Grade(
    GradeCode   INT(5) PRIMARY KEY,
    StuRegisID  INT(5),
    GradeResult VARCHAR(2),
    CONSTRAINT Grade_fk_StudyRegister FOREIGN KEY(StuRegisID) REFERENCES StudyRegister(StuRegisID)
);

-- 12. AssignScore Table
CREATE TABLE AssignScore(
    ScoreAssignID INT(6) PRIMARY KEY,
    UserID        INT(5),
    AssignID      VARCHAR(10),
    Status        VARCHAR(15),
    PriScore      INT(3),
    CONSTRAINT AssignScore_fk_UserInfo FOREIGN KEY(UserID) REFERENCES UserInfo(UserID),
    CONSTRAINT AssignScore_fk_StdAssignment FOREIGN KEY(AssignID) REFERENCES StdAssignment(AssignID)
);

-- 13. ReviewTeacher Table
CREATE TABLE ReviewTeacher(
    TeachReview INT(8) PRIMARY KEY,
    AssignID    VARCHAR(10),
    UserID      INT(5),
    UserReviewT VARCHAR(500),
    UserRateT   INT(1),
    CONSTRAINT ReviewTeacher_fk_StdAssignment FOREIGN KEY (AssignID) REFERENCES StdAssignment(AssignID),
    CONSTRAINT ReviewTeacher_fk_UserInfo FOREIGN KEY (UserID) REFERENCES UserInfo(UserID)
);

-- 14. TodoList Table
CREATE TABLE TodoList (
    TodoID      INT AUTO_INCREMENT PRIMARY KEY,
    UserID      INT(5),
    TaskName    VARCHAR(256),
    Priority    VARCHAR(10), 
    IsDone      CHAR(1) DEFAULT 'N',
    CreatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Todo_fk_User FOREIGN KEY (UserID) REFERENCES UserInfo(UserID)
);

-- 15. Notifications Table
CREATE TABLE Notifications (
    NotiID      INT AUTO_INCREMENT PRIMARY KEY,
    UserID      INT(5),
    Message     VARCHAR(500),
    NotiDate    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status      VARCHAR(10) DEFAULT 'UNREAD',
    CONSTRAINT Noti_fk_User FOREIGN KEY (UserID) REFERENCES UserInfo(UserID)
);

-- 1. Fact
INSERT INTO Fact (FCode, FNameENG, FNameTHA) VALUES 
('F001', 'Engineering', 'วิศวกรรมศาสตร์'),
('F002', 'Science', 'วิทยาศาสตร์'),
('F003', 'Architecture', 'สถาปัตยกรรมศาสตร์'),
('F004', 'Medicine', 'แพทยศาสตร์'),
('F005', 'Liberal Arts', 'ศิลปศาสตร์'),
('F006', 'Economics', 'เศรษฐศาสตร์'),
('F007', 'Law', 'นิติศาสตร์'),
('F008', 'Nursing', 'พยาบาลศาสตร์'),
('F009', 'Education', 'ครุศาสตร์'),
('F010', 'Management', 'การจัดการ');

-- 2. Major
INSERT INTO Major (MjCode, MjNameENG, MjNameTHA, FCode) VALUES 
('M001', 'Computer Engineering', 'วิศวกรรมคอมพิวเตอร์', 'F001'),
('M002', 'Biology', 'ชีววิทยา', 'F002'),
('M003', 'Urban Planning', 'ผังเมือง', 'F003'),
('M004', 'Surgery', 'ศัลยศาสตร์', 'F004'),
('M005', 'English Literature', 'วรรณคดีอังกฤษ', 'F005'),
('M006', 'Macroeconomics', 'เศรษฐศาสตร์มหภาค', 'F006'),
('M007', 'Criminal Law', 'กฎหมายอาญา', 'F007'),
('M008', 'General Nursing', 'พยาบาลทั่วไป', 'F008'),
('M009', 'Digital Learning', 'การเรียนรู้ดิจิทัล', 'F009'),
('M010', 'Marketing', 'การตลาด', 'F010');

-- 3. Teacher
INSERT INTO Teacher (TID, TFName, TLName) VALUES 
('T001', 'James', 'Smith'), ('T002', 'Maria', 'Garcia'),
('T003', 'Robert', 'Johnson'), ('T004', 'Patricia', 'Miller'),
('T005', 'Michael', 'Davis'), ('T006', 'Linda', 'Wilson'),
('T007', 'William', 'Brown'), ('T008', 'Elizabeth', 'Moore'),
('T009', 'David', 'Taylor'), ('T010', 'Barbara', 'Anderson');

-- 4. Event
INSERT INTO Event (EventID, EventName, EventStartDate, EventEndDate, EventType) VALUES 
('E001', 'Orientation', '2026-06-01', '2026-06-01', 'Academic'),
('E002', 'Midterm Exam', '2026-08-15', '2026-08-25', 'Exam'),
('E003', 'Sports Day', '2026-09-10', '2026-09-10', 'Activity'),
('E004', 'Final Project', '2026-11-01', '2026-11-30', 'Academic'),
('E005', 'Career Fair', '2026-12-05', '2026-12-06', 'Activity'),
('E006', 'Winter Break', '2026-12-25', '2027-01-05', 'Holiday'),
('E007', 'Graduation', '2027-02-20', '2027-02-21', 'Ceremony'),
('E008', 'Hackathon', '2026-07-20', '2026-07-22', 'Competition'),
('E009', 'Open House', '2026-10-15', '2026-10-15', 'Activity'),
('E010', 'Library Week', '2026-08-01', '2026-08-07', 'Academic');

-- 5. UserInfo
INSERT INTO UserInfo (UserID, UserFName, UserLName, UserEmail, UserPass, FCode, MjCode, UserType) VALUES 
(10001, 'Alice', 'Walker', 'alice@edu.com', 'hash1', 'F001', 'M001', 'STD'),
(10002, 'Bob', 'Ross', 'bob@edu.com', 'hash2', 'F002', 'M002', 'STD'),
(10003, 'Charlie', 'Brown', 'charlie@edu.com', 'hash3', 'F003', 'M003', 'STD'),
(10004, 'Diana', 'Prince', 'diana@edu.com', 'hash4', 'F004', 'M004', 'STD'),
(10005, 'Edward', 'Norton', 'edward@edu.com', 'hash5', 'F005', 'M005', 'STD'),
(10006, 'Fiona', 'Gallagher', 'fiona@edu.com', 'hash6', 'F006', 'M006', 'STD'),
(10007, 'George', 'Clooney', 'george@edu.com', 'hash7', 'F007', 'M007', 'STD'),
(10008, 'Hannah', 'Montana', 'hannah@edu.com', 'hash8', 'F008', 'M008', 'STD'),
(10009, 'Ian', 'McKellen', 'ian@edu.com', 'hash9', 'F009', 'M009', 'STD'),
(10010, 'Jack', 'Sparrow', 'jack@edu.com', 'hash10', 'F010', 'M010', 'STD');

-- 6. Subject
INSERT INTO Subject (SubjCode, SubjName, SubjCredit, FCode, SubjType) VALUES 
('CS101', 'Database Systems', 3, 'F001', 'Core'),
('BIO201', 'Cell Biology', 4, 'F002', 'Core'),
('ARC301', 'History of Art', 2, 'F003', 'Elective'),
('MED401', 'Anatomy', 4, 'F004', 'Core'),
('ENG105', 'Creative Writing', 3, 'F005', 'Elective'),
('ECO202', 'Microeconomics', 3, 'F006', 'Core'),
('LAW101', 'Intro to Law', 3, 'F007', 'Core'),
('NUR101', 'First Aid', 2, 'F008', 'Core'),
('EDU110', 'Child Psychology', 3, 'F009', 'Core'),
('MKT202', 'Digital Marketing', 3, 'F010', 'Elective');

-- 8. StdAssignment
INSERT INTO StdAssignment (AssignID, SubjCode, AssName, Dateline, Score) VALUES 
('AS01', 'CS101', 'SQL Lab 1', '2026-10-10', 10),
('AS02', 'CS101', 'ER Diagram', '2026-11-15', 20),
('AS03', 'BIO201', 'Microscope Quiz', '2026-10-20', 15),
('AS04', 'ARC301', 'Sketch Project', '2026-12-01', 50),
('AS05', 'MED401', 'Bone ID Test', '2026-11-20', 30),
('AS06', 'ENG105', 'Short Story', '2026-12-10', 40),
('AS07', 'ECO202', 'Market Analysis', '2026-11-05', 20),
('AS08', 'LAW101', 'Case Study 1', '2026-10-25', 25),
('AS09', 'NUR101', 'CPR Practice', '2026-11-10', 10),
('AS10', 'MKT202', 'SEO Report', '2026-12-15', 30);

-- 9. TeachAssignment
INSERT INTO TeachAssignment (TAssignID, TID, SubjCode, Year, Semester, StudyDay, StartTime, EndTime, Room) VALUES 
('TA01', 'T001', 'CS101', 2026, 1, 'MONDAY', '09:00', '12:00', 'Room 101'),
('TA02', 'T002', 'BIO201', 2026, 1, 'TUESDAY', '13:00', '16:00', 'Lab 4'),
('TA03', 'T003', 'ARC301', 2026, 1, 'WEDNESDAY', '10:00', '12:00', 'Studio A'),
('TA04', 'T004', 'MED401', 2026, 1, 'THURSDAY', '08:00', '12:00', 'Med Hall'),
('TA05', 'T005', 'ENG105', 2026, 1, 'FRIDAY', '13:00', '15:00', 'Room 205'),
('TA06', 'T006', 'ECO202', 2026, 1, 'MONDAY', '13:00', '16:00', 'Room 302'),
('TA07', 'T007', 'LAW101', 2026, 1, 'TUESDAY', '09:00', '12:00', 'Court 1'),
('TA08', 'T008', 'NUR101', 2026, 1, 'WEDNESDAY', '13:00', '15:00', 'Nurse Station'),
('TA09', 'T009', 'EDU110', 2026, 1, 'THURSDAY', '14:00', '17:00', 'Room 401'),
('TA10', 'T010', 'MKT202', 2026, 1, 'FRIDAY', '09:00', '12:00', 'Room 505');

-- 10. StudyRegister
INSERT INTO StudyRegister (StuRegisID, TAssignID, UserID, Section, StuRegisStatus) VALUES 
(501, 'TA01', 10001, 1, 'ENROLLED'),
(502, 'TA02', 10002, 1, 'ENROLLED'),
(503, 'TA03', 10003, 1, 'ENROLLED'),
(504, 'TA04', 10004, 1, 'ENROLLED'),
(505, 'TA05', 10005, 1, 'ENROLLED'),
(506, 'TA06', 10006, 1, 'ENROLLED'),
(507, 'TA07', 10007, 1, 'ENROLLED'),
(508, 'TA08', 10008, 1, 'ENROLLED'),
(509, 'TA09', 10009, 1, 'ENROLLED'),
(510, 'TA10', 10010, 1, 'ENROLLED');

-- 11. Grade
INSERT INTO Grade (GradeCode, StuRegisID, GradeResult) VALUES 
(901, 501, 'A'), (902, 502, 'B+'), (903, 503, 'B'),
(904, 504, 'A'), (905, 505, 'C+'), (906, 506, 'B'),
(907, 507, 'A'), (908, 508, 'B+'), (909, 509, 'C'), (910, 510, 'A');

-- 12. AssignScore
INSERT INTO AssignScore (ScoreAssignID, UserID, AssignID, Status, PriScore) VALUES 
(601, 10001, 'AS01', 'SUBMITTED', 10),
(602, 10002, 'AS03', 'SUBMITTED', 14),
(603, 10003, 'AS04', 'PENDING', 0),
(604, 10004, 'AS05', 'SUBMITTED', 28),
(605, 10005, 'AS06', 'LATE', 35),
(606, 10006, 'AS07', 'SUBMITTED', 18),
(607, 10007, 'AS08', 'PENDING', 0),
(608, 10008, 'AS09', 'SUBMITTED', 9),
(609, 10009, 'AS01', 'SUBMITTED', 8),
(610, 10010, 'AS10', 'SUBMITTED', 27);

-- 13. ReviewTeacher
INSERT INTO ReviewTeacher (TeachReview, AssignID, UserID, UserReviewT, UserRateT) VALUES 
(801, 'AS01', 10001, 'Great teacher!', 5),
(802, 'AS03', 10002, 'Very helpful feedback.', 4),
(803, 'AS04', 10003, 'Instructions were unclear.', 2),
(804, 'AS05', 10004, 'Passionate about anatomy.', 5),
(805, 'AS06', 10005, 'Strict but fair.', 4),
(806, 'AS07', 10006, 'Good material.', 3),
(807, 'AS08', 10007, 'Excellent case studies.', 5),
(808, 'AS09', 10008, 'Fun practical class.', 5),
(809, 'AS01', 10009, 'Loved the coding labs.', 4),
(810, 'AS10', 10010, 'Insightful for marketing.', 4);

-- 14. TodoList
INSERT INTO TodoList (UserID, TaskName, Priority, IsDone) VALUES 
(10001, 'Study for DB Quiz', 'HIGH', 'N'),
(10002, 'Buy lab goggles', 'MEDIUM', 'Y'),
(10003, 'Sketching practice', 'LOW', 'N'),
(10004, 'Memorize bones', 'HIGH', 'N'),
(10005, 'Read novel chapter 4', 'MEDIUM', 'Y'),
(10006, 'Chart analysis', 'LOW', 'N'),
(10007, 'Review criminal case', 'HIGH', 'N'),
(10008, 'Restock bandages', 'LOW', 'Y'),
(10009, 'Child psych notes', 'MEDIUM', 'N'),
(10010, 'Check SEO trends', 'HIGH', 'Y');

-- 15. Notifications
INSERT INTO Notifications (UserID, Message, Status) VALUES 
(10001, 'Assignment AS01 graded', 'READ'),
(10002, 'New lab safety guidelines', 'UNREAD'),
(10003, 'Studio session rescheduled', 'UNREAD'),
(10004, 'Welcome to Anatomy 101', 'READ'),
(10005, 'Submission confirmed: Short Story', 'READ'),
(10006, 'Library book overdue', 'UNREAD'),
(10007, 'Moot court registration open', 'UNREAD'),
(10008, 'Shift change reminder', 'READ'),
(10009, 'Psychology workshop next Monday', 'UNREAD'),
(10010, 'Google Ads voucher received', 'READ');

-- GPA View
CREATE OR REPLACE VIEW v_student_gpa AS
SELECT 
    u.UserID,
    CONCAT(u.UserFName, ' ', u.UserLName) AS FullName,
    ROUND(SUM(
        CASE g.GradeResult
            WHEN 'A'  THEN 4.0
            WHEN 'B+' THEN 3.5
            WHEN 'B'  THEN 3.0
            WHEN 'C+' THEN 2.5
            WHEN 'C'  THEN 2.0
            WHEN 'D+' THEN 1.5
            WHEN 'D'  THEN 1.0
            WHEN 'F'  THEN 0.0
            ELSE 0.0
        END * s.SubjCredit
    ) / NULLIF(SUM(s.SubjCredit), 0), 2) AS GPAX
FROM Grade g
JOIN StudyRegister sr ON g.StuRegisID = sr.StuRegisID
JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
JOIN Subject s ON ta.SubjCode = s.SubjCode
JOIN UserInfo u ON sr.UserID = u.UserID
GROUP BY u.UserID, u.UserFName, u.UserLName;

-- Daily Schedule View
CREATE OR REPLACE VIEW student_daily_schedule AS
SELECT 
    u.UserID,
    CONCAT(u.UserFName, ' ', u.UserLName) AS FullName,
    s.SubjCode,
    s.SubjName,
    ta.StudyDay,
    ta.StartTime,
    ta.EndTime,
    ta.Room
FROM UserInfo u
JOIN StudyRegister sr ON u.UserID = sr.UserID
JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
JOIN Subject s ON ta.SubjCode = s.SubjCode
WHERE sr.StuRegisStatus = 'ENROLLED';

-- Pending Assignments View
CREATE OR REPLACE VIEW student_pending_assignments AS
SELECT 
    sr.UserID,
    sa.AssignID,
    sa.AssName,
    s.SubjName,
    sa.Dateline,
    IFNULL(ans.Status, 'NOT SUBMITTED') as CurrentStatus
FROM StudyRegister sr
JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
JOIN Subject s ON ta.SubjCode = s.SubjCode
JOIN StdAssignment sa ON s.SubjCode = sa.SubjCode
LEFT JOIN AssignScore ans ON sr.UserID = ans.UserID AND sa.AssignID = ans.AssignID
WHERE (ans.Status IS NULL OR ans.Status != 'SUBMITTED')
  AND sa.Dateline >= CURDATE();

-- Dashboard View
CREATE OR REPLACE VIEW v_student_dashboard AS
SELECT 
    n.UserID,
    n.Message AS Notification,
    n.NotiDate,
    n.Status AS ReadStatus,
    'ALERT' AS Type
FROM Notifications n
UNION ALL
SELECT 
    UserID,
    CONCAT('Must Submit: ', AssName, ' (Subject: ', SubjName, ')') AS Notification,
    Dateline,
    CurrentStatus,
    'PENDING_TASK' AS Type
FROM student_pending_assignments;

-- 7. View: Faculty Enrollment Statistics (Count students per faculty)
CREATE OR REPLACE VIEW v_faculty_stats AS
SELECT f.FCode, f.FNameENG, COUNT(u.UserID) AS TotalStudents
FROM Fact f
LEFT JOIN UserInfo u ON f.FCode = u.FCode
GROUP BY f.FCode, f.FNameENG;

-- 8. View: Teacher Performance Summary (Average ratings from reviews)
CREATE OR REPLACE VIEW v_teacher_reviews AS
SELECT t.TID, t.TFName, t.TLName, 
       ROUND(AVG(rt.UserRateT), 1) AS AvgRating,
       COUNT(rt.TeachReview) AS TotalReviews
FROM Teacher t
JOIN TeachAssignment ta ON t.TID = ta.TID
JOIN Subject s ON ta.SubjCode = s.SubjCode
JOIN StdAssignment sa ON s.SubjCode = sa.SubjCode
JOIN ReviewTeacher rt ON sa.AssignID = rt.AssignID
GROUP BY t.TID, t.TFName, t.TLName;

-- 9. View: Subject Workload (How many assignments per subject)
CREATE OR REPLACE VIEW v_subject_workload AS
SELECT s.SubjCode, s.SubjName, COUNT(sa.AssignID) AS TotalAssignments
FROM Subject s
LEFT JOIN StdAssignment sa ON s.SubjCode = sa.SubjCode
GROUP BY s.SubjCode, s.SubjName;

-- 10. View: User Credit Progress (Total credits enrolled by each student)
CREATE OR REPLACE VIEW v_student_credits AS
SELECT u.UserID, u.UserFName, u.UserLName, SUM(s.SubjCredit) AS TotalEnrolledCredits
FROM UserInfo u
JOIN StudyRegister sr ON u.UserID = sr.UserID
JOIN TeachAssignment ta ON sr.TAssignID = ta.TAssignID
JOIN Subject s ON ta.SubjCode = s.SubjCode
WHERE sr.StuRegisStatus = 'ENROLLED'
GROUP BY u.UserID, u.UserFName, u.UserLName;

SELECT * FROM v_student_credits;
