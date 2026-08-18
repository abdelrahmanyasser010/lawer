export function passwordValidationError(value:string):string{
  if(value.length<8||value.length>128)return "كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.";
  if(!/[A-Za-z\u0600-\u06FF]/u.test(value))return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.";
  if(!/\d/.test(value))return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
  return "";
}
