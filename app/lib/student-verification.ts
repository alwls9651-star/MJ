export interface StudentVerificationInput { grade:number; department:string; studentNumber:number; name:string; password:string }
export function parseStudentVerificationInput(value:unknown):StudentVerificationInput|null {
  if(!value||typeof value!=="object")return null; const v=value as Record<string,unknown>;
  const grade=Number(v.grade), studentNumber=Number(v.studentNumber), department=typeof v.department==="string"?v.department.trim():"", name=typeof v.name==="string"?v.name.trim():"";
  if(!Number.isInteger(grade)||grade<1||grade>3||!Number.isInteger(studentNumber)||studentNumber<1||!department||!name)return null;
  const password=typeof v.password==="string"?v.password:"";
  return {grade,studentNumber,department,name,password};
}
