1. หน้า Dashboard (ind.ejs)

หน้านี้ทำหน้าที่เป็น "ศูนย์รวมข้อมูล" (Aggregation) จึงมีการดึงข้อมูลหลายชุดพร้อมกัน:

Stats (GPAX, Credits): ใช้คำสั่ง SUM และ AVG จากตารางผลการเรียน 


Notifications (dashboard): ดึงจากตารางประกาศ (Announcements) โดยมักจะเรียงตามวันที่ล่าสุด ORDER BY NotiDate DESC

Faculty Stats (facultyStats): ใช้ GROUP BY FacultyID ร่วมกับ COUNT(StudentID) เพื่อสรุปยอดนักศึกษาในแต่ละคณะออกมาเป็นตาราง

2. หน้าจัดการหลักสูตรและตารางสอน (academic.ejs)

เน้นการแสดงผล "ความสัมพันธ์" (Relationship) ของข้อมูล:

Curriculum: ดึงข้อมูลจากตาราง Faculties JOIN กับ Majors เพื่อให้เห็นว่าคณะนี้มีสาขาอะไรบ้าง

Schedules: เป็นการ JOIN 4-5 ตารางเข้าด้วยกัน (Schedules + Subjects + Teachers + Rooms) เพื่อเปลี่ยน "รหัส ID" ให้เป็น "ชื่อที่อ่านออก" เช่น เปลี่ยน T001 เป็น อาจารย์สมชาย

3. หน้าจัดการการเรียน (lms.ejs)

เน้นการดึงข้อมูล "สถานะ" (Status) ของนักศึกษาคนนั้นๆ:

Assignments: ดึงงานที่ได้รับมอบหมาย โดยอาจจะมีเงื่อนไข WHERE StudentID = ? และเช็คสถานะจากตารางการส่งงาน (Submissions) เพื่อระบุว่าเป็น SUBMITTED หรือ PENDING

Grades: ดึงจากตารางการลงทะเบียน (Enrollment) JOIN กับวิชา (Subjects) เพื่อเอาเกรดออกมาแสดง

4. หน้าลงทะเบียนเรียน (registra.ejs)

หน้านี้มีความซับซ้อนเรื่อง "เงื่อนไข" (Logic Check):

Available Courses: ดึงวิชาที่เปิดสอนในเทอมปัจจุบัน โดยอาจจะกรองวิชาที่นักศึกษา "เคยเรียนผ่านไปแล้ว" ออกไป

Workloads: ใช้ COUNT จากตาราง Assignments เพื่อบอกนักศึกษาว่าวิชานี้ "งานเยอะไหม" ก่อนกดเพิ่มวิชา

Total Credits: ใช้การ SUM(SubjCredit) ของวิชาที่กดเลือกไว้ เพื่อเช็คว่าเกิน 22 หน่วยกิตตามที่ระบบตั้งไว้หรือไม่

5. หน้าประเมินอาจารย์ (eva.ejs)

เน้นการใช้ "ข้อมูลเชิงสถิติ" (Analytics):

Pending Reviews: ดึงรายชื่อวิชาที่นักศึกษาลงเรียนไว้แต่ "ยังไม่ได้ประเมิน" โดยเช็คจากตาราง Evaluations ว่ายังไม่มี Record ของ StudentID นี้

Leaderboard (teacherReviews): ใช้คำสั่ง AVG(Rating) และ COUNT(*) จากตารางประเมินทั้งหมด เพื่อมาโชว์คะแนนเฉลี่ยของอาจารย์แต่ละท่าน

6. หน้ากิจกรรม (eve.ejs)

เน้นการกรองด้วย "เวลา" (Time Filtering):

Upcoming Events: ใช้ WHERE EventStartDate >= CURRENT_DATE เพื่อโชว์เฉพาะกิจกรรมที่ยังไม่เริ่มหรือกำลังจัดอยู่

My Events: ดึงจากตารางความสัมพันธ์ระหว่าง Students และ Events (Many-to-Many) เพื่อดูว่าเราลงชื่อที่ไหนไว้บ้าง