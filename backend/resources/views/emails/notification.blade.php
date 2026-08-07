<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ $title }}</title></head>
<body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Tahoma,sans-serif;color:#00102e">
<div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
  <div style="background:#00102e;color:#fff;padding:20px 24px">
    <div style="font-size:22px;font-weight:900">Z Legal | Z draft</div>
    <div style="font-size:12px;color:#d9a84e;margin-top:4px">العقود والخدمات القانونية</div>
  </div>
  <div style="padding:26px">
    <h2 style="margin:0 0 14px">مرحبًا {{ $name ?: 'عميل Z draft' }}</h2>
    <h3 style="margin:0 0 12px;color:#986410">{{ $title }}</h3>
    <p style="line-height:1.9;color:#334155;white-space:pre-line">{{ $message }}</p>
    @if($templateKey === 'verify_email_otp' && $verificationCode)
      <div style="text-align:center;margin:24px 0">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px">رمز تأكيد البريد</div>
        <div dir="ltr" style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:900;color:#00102e;background:#f8fafc;border:1px solid #cbd5e1;border-radius:14px;padding:16px 22px">{{ $verificationCode }}</div>
        <p style="font-size:12px;color:#64748b">صالح لمدة {{ $expiresMinutes }} دقائق. لا تشارك الرمز مع أي شخص.</p>
      </div>
    @endif
    @if($temporaryPassword)
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:18px 0">كلمة المرور المؤقتة: <strong dir="ltr">{{ $temporaryPassword }}</strong></div>
    @endif
    @if($actionUrl && $templateKey !== 'verify_email_otp')
      <p style="margin:24px 0"><a href="{{ $actionUrl }}" style="display:inline-block;background:#00102e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">{{ $buttonLabel }}</a></p>
    @endif
    <p style="font-size:12px;line-height:1.8;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">هذه رسالة تلقائية مرتبطة بحسابك أو بطلب بدأته على منصة Z draft. يمكنك الرد على الرسالة للتواصل مع المكتب.</p>
  </div>
</div>
</body></html>
