export type TeacherRole = "admin" | "teacher";
export type ApplicationStatus = "applied" | "cancelled";
export interface Student { id:string; academic_year:number; grade:number; department:string; student_number:number; name:string; password_hash:string|null; must_change_password:boolean; password_updated_at:string|null; created_at:string; updated_at:string }
export interface Teacher { id:string; auth_user_id:string|null; name:string; email:string|null; role:TeacherRole; is_active:boolean; created_at:string; updated_at:string }
export interface AdminAuditLog { id:string; admin_teacher_id:string; action:"student_temporary_password_issued"|"student_password_reset"; target_type:"student"; target_id:string; created_at:string }
export interface Course { id:string; academic_year:number; sequence:number; subject:string; lecture_start_date:string; lecture_end_date:string; lecture_days:string|null; eligibility:string; teacher_id:string; capacity:number; is_active:boolean; created_at:string; updated_at:string }
export interface ApplicationSetting { id:string; academic_year:number; application_start:string; application_end:string; is_open:boolean; created_at:string; updated_at:string }
export interface Application { id:string; student_id:string; course_id:string; status:ApplicationStatus; applied_at:string; cancelled_at:string|null; created_at:string; updated_at:string }
type Insert<T, Optional extends keyof T = never> =
  Omit<T,"id"|"created_at"|"updated_at"|Optional> &
  Partial<Pick<T,Optional>> & {id?:string;created_at?:string;updated_at?:string};
type Update<T> = Partial<Omit<T,"created_at">>;
export interface Database { public:{ Tables:{
  students:{Row:Student;Insert:Insert<Student,"password_hash"|"must_change_password"|"password_updated_at">;Update:Update<Student>;Relationships:[]};
  teachers:{Row:Teacher;Insert:Insert<Teacher,"auth_user_id"|"email"|"is_active">;Update:Update<Teacher>;Relationships:[]};
  courses:{Row:Course;Insert:Insert<Course,"lecture_days"|"is_active">;Update:Update<Course>;Relationships:[]};
  application_settings:{Row:ApplicationSetting;Insert:Insert<ApplicationSetting,"is_open">;Update:Update<ApplicationSetting>;Relationships:[]};
  applications:{Row:Application;Insert:Insert<Application,"status"|"applied_at"|"cancelled_at">;Update:Update<Application>;Relationships:[]};
  admin_audit_logs:{Row:AdminAuditLog;Insert:Insert<AdminAuditLog>;Update:Update<AdminAuditLog>;Relationships:[]};
};Views:Record<string,never>;Functions:{
 verify_student_credentials:{Args:{p_academic_year:number;p_grade:number;p_department:string;p_student_number:number;p_name:string;p_password:string};Returns:{student_id:string;must_change_password:boolean}[]};
 change_student_password:{Args:{p_student_id:string;p_current_password:string;p_new_password:string};Returns:boolean};
 admin_reset_student_password:{Args:{p_admin_teacher_id:string;p_student_id:string;p_temporary_password:string};Returns:boolean};
 get_application_window:{Args:{p_academic_year:number};Returns:{application_start:string;application_end:string;is_open:boolean;status:"BEFORE"|"OPEN"|"CLOSED";server_now:string}[]};
 apply_for_course:{Args:{p_student_id:string;p_course_id:string;p_academic_year:number};Returns:{success:boolean;code:string;application_id:string|null;applied_at:string|null}[]};
 cancel_course_application:{Args:{p_student_id:string;p_academic_year:number};Returns:{success:boolean;code:string;application_id:string|null;cancelled_at:string|null}[]};
 is_student_eligible:{Args:{p_grade:number;p_eligibility:string};Returns:boolean};
};Enums:Record<string,never>;CompositeTypes:Record<string,never> } }
