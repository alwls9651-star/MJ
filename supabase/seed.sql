insert into public.students (academic_year,grade,department,student_number,name) values
 (2026,1,'유통경영과',1,'김하늘'), (2026,1,'유통경영과',2,'이준호'), (2026,2,'금융회계과',1,'박서연');
insert into public.teachers (id,name,role) values
 ('10000000-0000-4000-8000-000000000001','관리자','admin'),
 ('10000000-0000-4000-8000-000000000002','김민지','teacher'),
 ('10000000-0000-4000-8000-000000000003','이도윤','teacher'),
 ('10000000-0000-4000-8000-000000000004','박서현','teacher');
insert into public.courses (academic_year,sequence,subject,lecture_start_date,lecture_end_date,lecture_days,eligibility,teacher_id,capacity) values
 (2026,1,'회계 기초','2026-08-24','2026-12-10','화, 목','전학년','10000000-0000-4000-8000-000000000002',20),
 (2026,2,'컴퓨터 활용','2026-08-24','2026-12-10','월, 수','전학년','10000000-0000-4000-8000-000000000003',20),
 (2026,3,'마케팅 기초','2026-08-24','2026-12-10','금','1~2학년','10000000-0000-4000-8000-000000000004',18);
insert into public.application_settings (academic_year,application_start,application_end,is_open)
 values (2026,'2026-08-19 09:00:00+09','2026-08-21 17:00:00+09',true);
