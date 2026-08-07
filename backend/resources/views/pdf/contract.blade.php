<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@page { size: A4; margin: 18mm 17mm 18mm; @bottom-center { content: counter(page); font-size: 9pt; color: #555; } }
*{box-sizing:border-box} body{font-family:"Noto Naskh Arabic","DejaVu Sans",Tahoma,Arial,sans-serif;color:#111;font-size:12.2pt;line-height:1.75;margin:0}
.header{border-bottom:1.2px solid #222;padding-bottom:10px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:800;font-size:13pt}.subtitle{font-size:9pt;color:#555}.logo{width:62px;max-height:52px;object-fit:contain}.title{text-align:center;font-size:19pt;font-weight:900;margin:18px 0 8px}.meta{text-align:center;font-size:10.5pt;color:#333;margin-bottom:18px}.section{margin:12px 0;break-inside:avoid}.section h2,.clause h2{font-size:13pt;margin:0 0 6px;padding:5px 9px;background:#f1f1f1;border-right:3px solid #333}.data{width:100%;border-collapse:collapse;margin:4px 0 10px;font-size:10.5pt}.data th,.data td{border:1px solid #999;padding:5px 7px;vertical-align:top}.data th{width:33%;background:#fafafa;text-align:right}.clause{margin:10px 0;break-inside:auto}.clause p{margin:0;text-align:justify;white-space:pre-line}.signatures{margin-top:28px;display:flex;gap:24px;page-break-inside:avoid}.signature{flex:1;border-top:1px solid #444;padding-top:8px;min-height:70px}.footer-note{font-size:8.5pt;color:#666;margin-top:20px;border-top:1px solid #ddd;padding-top:8px}.annex-ref{padding:8px 10px;border:1px solid #999;background:#fafafa;margin:12px 0}.page-break{page-break-before:always}
</style>
</head>
<body>
<div class="header">
  <div><div class="brand">{{ $officeName }}</div><div class="subtitle">منصة Z draft للعقود والاستشارات الذكية</div></div>
  @if($logoPath)<img src="{{ $logoPath }}" class="logo">@endif
</div>
<div class="title">{{ $title }}</div>
<div class="meta">رقم المستند: {{ $serialNumber }} &nbsp; | &nbsp; تاريخ الإصدار: {{ $issuedAt }}</div>
@if($documentKind === 'annex')<div class="annex-ref">هذا الملحق جزء مرتبط بالعقد رقم <strong>{{ $serialNumber }}</strong> ويُقرأ معه كوحدة واحدة.</div>@endif
@foreach($sections as $section)
  @if(count($section['rows']))
  <div class="section">
    <h2>{{ $section['title'] }}</h2>
    <table class="data">
      @foreach($section['rows'] as $row)<tr><th>{{ $row['label'] }}</th><td>{!! nl2br(e($row['value'])) !!}</td></tr>@endforeach
    </table>
  </div>
  @endif
@endforeach
@foreach($clauses as $index=>$clause)
<div class="clause">
  <h2>{{ $clause['titleAr'] ?: ('المادة '.($index+1)) }}</h2>
  <p>{{ $clause['bodyAr'] }}</p>
</div>
@endforeach
<div class="signatures">
  <div class="signature"><strong>الطرف الأول</strong><br>الاسم:<br>التوقيع:<br>البصمة:</div>
  <div class="signature"><strong>الطرف الثاني</strong><br>الاسم:<br>التوقيع:<br>البصمة:</div>
</div>
<div class="footer-note">أُنشئ هذا المستند من البيانات المعتمدة في منصة Z draft. النسخة الإلكترونية محفوظة ببصمة رقمية داخل سجل العقد.</div>
</body></html>
