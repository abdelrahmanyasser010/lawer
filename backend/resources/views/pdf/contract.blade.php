<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@page {
  size: A4;
  margin: 16mm 15mm 16mm 15mm;
  @top-center {
    content: string(docTitle) " — " string(docSerial);
    font-family: "Noto Naskh Arabic", "DejaVu Sans", sans-serif;
    font-size: 7.7pt;
    color: #666;
    border-bottom: .35pt solid #c9c9c9;
    padding-bottom: 2mm;
  }
  @bottom-center {
    content: string(docSerial) "  |  صفحة " counter(page) " من " counter(pages);
    font-family: "Noto Naskh Arabic", "DejaVu Sans", sans-serif;
    font-size: 7.7pt;
    color: #666;
  }
  @bottom-left {
    content: string(docHash);
    font-family: "DejaVu Sans", sans-serif;
    font-size: 6.5pt;
    color: #999;
  }
}
@page:first {
  margin-top: 13mm;
  @top-center { content: none; border: 0; padding: 0; }
}
* { box-sizing: border-box; }
html,body { margin:0; padding:0; }
body {
  font-family: "Noto Naskh Arabic", "Noto Sans Arabic", "DejaVu Sans", Tahoma, Arial, sans-serif;
  color:#111;
  font-size:11.35pt;
  line-height:1.52;
  direction:rtl;
}
.masthead {
  display:flex;
  align-items:center;
  justify-content:space-between;
  min-height:18mm;
  border-bottom:.8pt solid #202020;
  padding-bottom:3mm;
  margin-bottom:5mm;
}
.identity { display:flex; align-items:center; gap:3mm; }
.logo { width:27mm; max-height:15mm; object-fit:contain; }
.office { font-size:10.4pt; font-weight:700; color:#222; }
.document-kind { font-size:8.4pt; color:#666; margin-top:.5mm; }
.title {
  string-set: docTitle content();
  text-align:center;
  font-size:17.5pt;
  line-height:1.25;
  font-weight:800;
  margin:2mm 0 2mm;
}
.meta { text-align:center; font-size:9.4pt; color:#333; margin-bottom:5mm; }
.serial { string-set: docSerial content(); font-weight:700; direction:ltr; display:inline-block; }
.hash-string { string-set: docHash content(); position:absolute; width:.1mm; height:.1mm; overflow:hidden; opacity:0; font-size:1px; }
.annex-ref {
  margin:0 0 4mm;
  padding:2.6mm 3mm;
  border-top:.6pt solid #777;
  border-bottom:.6pt solid #777;
  font-size:9.5pt;
  text-align:center;
}
.data-section { margin:0 0 3.2mm; break-inside:auto; }
.party-line { margin:0; padding:0 0 1.3mm; font-size:9.55pt; line-height:1.48; text-align:justify; }
.party-item { display:inline; }
.party-item + .party-item::before { content:" ؛ "; color:#777; }
.party-item .data-label { display:inline; color:#555; font-size:8.4pt; }
.party-item .data-value { display:inline; font-size:9.55pt; font-weight:700; }
.data-section h2,
.clause h2 {
  font-size:11.25pt;
  line-height:1.35;
  font-weight:800;
  margin:0 0 1.8mm;
  padding:0 0 1mm;
  border-bottom:.45pt solid #9a9a9a;
  break-after:avoid-page;
}
.data-grid { width:100%; border-collapse:collapse; table-layout:fixed; font-size:9.5pt; margin-bottom:1.5mm; }
.data-grid td { width:50%; vertical-align:top; border-bottom:.25pt solid #e2e2e2; padding:1.2mm 1.5mm; }
.data-grid td.empty { border-bottom:0; }
.data-label { color:#666; font-size:8.15pt; line-height:1.25; margin-bottom:.3mm; }
.data-value { color:#111; font-weight:600; line-height:1.35; overflow-wrap:anywhere; }
.ltr { direction:ltr; text-align:right; }
.repeater-title { font-weight:700; font-size:9.3pt; margin:2mm 0 1mm; }
.repeater { width:100%; border-collapse:collapse; font-size:8.6pt; margin-bottom:2mm; break-inside:auto; }
.repeater thead { display:table-header-group; }
.repeater th,.repeater td { border:.35pt solid #aaa; padding:1.1mm 1.4mm; vertical-align:top; }
.repeater th { background:#f7f7f7; font-weight:700; }
.clause { margin:0 0 3.2mm; break-inside:auto; }
.clause p { margin:0; text-align:justify; white-space:pre-line; orphans:3; widows:3; }
.clause + .clause { margin-top:1mm; }
.signatures { margin-top:8mm; break-inside:avoid-page; }
.signatures-title { font-size:11.5pt; font-weight:800; border-bottom:.55pt solid #777; padding-bottom:1mm; margin-bottom:3mm; }
.signature-table { width:100%; border-collapse:separate; border-spacing:5mm 0; table-layout:fixed; }
.signature-box { width:50%; vertical-align:top; border-top:.75pt solid #444; padding-top:2mm; min-height:34mm; font-size:9.7pt; }
.signature-role { font-weight:800; font-size:10.5pt; margin-bottom:1.5mm; }
.signature-name { min-height:5mm; }
.signature-line { margin-top:2.2mm; }
.final-note { margin-top:5mm; padding-top:2mm; border-top:.35pt solid #ccc; font-size:7.8pt; color:#666; text-align:center; }
.page-break { break-before:page; }
</style>
</head>
<body>
@if($hashShort)<span class="hash-string">بصمة: {{ $hashShort }}</span>@else<span class="hash-string"></span>@endif
<div class="masthead">
  <div>
    <div class="office">{{ $officeName }}</div>
    <div class="document-kind">{{ $documentKind === 'annex' ? 'ملحق تعاقدي' : 'محرر تعاقدي' }}</div>
  </div>
  @if($logoPath)<img src="{{ $logoPath }}" class="logo" alt="Z draft">@endif
</div>

<div class="title">{{ $title }}</div>
<div class="meta">
  @if($documentKind === 'annex' && ($manualAnnex ?? false))
    رقم الملحق: <span class="serial">........................</span>
    &nbsp; | &nbsp; تابع للعقد رقم: <span class="ltr">........................</span>
    &nbsp; | &nbsp; تاريخ العقد: <span class="ltr">.... / .... / ........</span>
  @else
    رقم المستند: <span class="serial">{{ $annexRef ?: $serialNumber }}</span>
    &nbsp; | &nbsp; تاريخ العقد: <span class="ltr">{{ $issuedAt }}</span>
  @endif
</div>

@if($documentKind === 'annex')
<div class="annex-ref">
  @if($manualAnnex ?? false)
    هذا الملحق قالب فارغ للتعبئة اليدوية، ويصبح جزءًا لا يتجزأ من العقد بعد استكمال بياناته واعتماده وفقًا لأحكام العقد.
  @else
    هذا الملحق جزء لا يتجزأ من العقد رقم <strong class="ltr">{{ $serialNumber }}</strong>، ويُقرأ ويُفسر معه كوحدة واحدة.
  @endif
</div>
@endif

@if(count($sections))
<div class="contract-data">
  @foreach($sections as $section)
    <div class="data-section">
      <h2>{{ $section['title'] }}</h2>
      @if(count($section['items']))
        @if(($section['presentation'] ?? 'grid') === 'party')
          <p class="party-line">
            @foreach($section['items'] as $item)
              <span class="party-item"><span class="data-label">{{ $item['label'] }}:</span> <span class="data-value {{ $item['ltr'] ? 'ltr' : '' }}">{!! nl2br(e($item['value'])) !!}</span></span>
            @endforeach
          </p>
        @else
          <table class="data-grid">
            @foreach(array_chunk($section['items'], 2) as $pair)
              <tr>
                @foreach($pair as $item)
                  <td>
                    <div class="data-label">{{ $item['label'] }}</div>
                    <div class="data-value {{ $item['ltr'] ? 'ltr' : '' }}">{!! nl2br(e($item['value'])) !!}</div>
                  </td>
                @endforeach
                @if(count($pair) === 1)<td class="empty"></td>@endif
              </tr>
            @endforeach
          </table>
        @endif
      @endif
      @foreach($section['repeaters'] as $repeater)
        <div class="repeater-title">{{ $repeater['title'] }}</div>
        <table class="repeater">
          <thead><tr>@foreach($repeater['columns'] as $column)<th>{{ $column['label'] }}</th>@endforeach</tr></thead>
          <tbody>
            @foreach($repeater['rows'] as $row)
              <tr>@foreach($row as $value)<td>{{ $value }}</td>@endforeach</tr>
            @endforeach
          </tbody>
        </table>
      @endforeach
    </div>
  @endforeach
</div>
@endif

@foreach($clauses as $index=>$clause)
  @if(trim((string)($clause['bodyAr'] ?? '')) !== '')
  <div class="clause">
    <h2>{{ $clause['titleAr'] ?: ('البند '.($index+1)) }}</h2>
    <p>{{ $clause['bodyAr'] }}</p>
  </div>
  @endif
@endforeach

<div class="signatures">
  <div class="signatures-title">التوقيعات</div>
  <table class="signature-table">
    <tr>
      @foreach($parties as $party)
      <td class="signature-box">
        <div class="signature-role">{{ $party['label'] }}</div>
        <div class="signature-name">الاسم: {{ ($documentKind === 'annex' && ($manualAnnex ?? false)) ? '................................................' : ($party['name'] ?: '................................................') }}</div>
        @if($identitySignatureLayout ?? false)
        <div class="signature-line">الصفة: ................................................</div>
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
        @elseif(($rentalSignatureLayout ?? null) === 'administrative')
        <div class="signature-line">الصفة: {{ $party['capacity'] ?? '................................................' }}</div>
        <div class="signature-line">الرقم القومي / رقم الجواز: <span class="ltr">{{ $party['nationalId'] ?? '................................' }}</span></div>
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
        @elseif(($rentalSignatureLayout ?? null) === 'standard')
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
        @elseif($saleSignatureLayout ?? false)
          @if($documentKind === 'annex')
          <div class="signature-line">الصفة: {{ ($manualAnnex ?? false) ? '................................................' : ($party['capacity'] ?? '................................................') }}</div>
          @endif
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
        @else
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">التاريخ: .... / .... / ........</div>
        <div class="signature-line">البصمة (إن وجدت): ................................</div>
        @endif
      </td>
      @endforeach
    </tr>
  </table>
</div>

@if($documentKind === 'main' && count($witnesses ?? []))
<div class="signatures witnesses">
  <div class="signatures-title">الشهود (إن وجدوا)</div>
  <table class="signature-table"><tr>
    @foreach($witnesses as $witness)
    <td class="signature-box">
      <div class="signature-role">{{ $witness['label'] }}</div>
      <div class="signature-name">الاسم: {{ $witness['name'] ?: '................................................' }}</div>
      <div class="signature-line">الرقم القومي: <span class="ltr">{{ $witness['nationalId'] ?: '................................' }}</span></div>
      <div class="signature-line">التوقيع: ................................................</div>
    </td>
    @endforeach
    @if(count($witnesses) === 1)<td class="signature-box"></td>@endif
  </tr></table>
</div>
@endif

<div class="final-note">
  {{ ($documentKind === 'annex' && ($manualAnnex ?? false)) ? 'قالب ملحق فارغ للتعبئة اليدوية — لا يتضمن بيانات المستخدم تلقائيًا.' : 'النسخة الإلكترونية المرجعية لهذا المحرر محفوظة في سجل العقد برقم المستند المبين أعلاه.' }}
</div>

@foreach(($annexes ?? []) as $annex)
<div class="page-break"></div>
<div class="masthead">
  <div>
    <div class="office">{{ $officeName }}</div>
    <div class="document-kind">{{ ($annex['manualFill'] ?? false) ? 'ملحق تعاقدي — قالب للتعبئة اليدوية' : 'ملحق تعاقدي' }}</div>
  </div>
  @if($logoPath)<img src="{{ $logoPath }}" class="logo" alt="Z draft">@endif
</div>
<div class="title">{{ $annex['title'] }}</div>
<div class="meta">
  @if($annex['manualFill'] ?? false)
    رقم الملحق: <span class="serial">........................</span>
    &nbsp; | &nbsp; تابع للعقد رقم: <span class="ltr">........................</span>
    &nbsp; | &nbsp; تاريخ العقد: <span class="ltr">.... / .... / ........</span>
  @else
    رقم الملحق: <span class="serial">{{ $annex['annexRef'] }}</span>
    &nbsp; | &nbsp; تابع للعقد رقم: <span class="ltr">{{ $serialNumber }}</span>
    &nbsp; | &nbsp; تاريخ العقد: <span class="ltr">{{ $issuedAt }}</span>
  @endif
</div>
<div class="annex-ref">
  @if($annex['manualFill'] ?? false)
    هذا الملحق قالب فارغ للتعبئة اليدوية، ويُطبع مع العقد في ملف PDF واحد، ولا تُنقل إليه بيانات المستخدم تلقائيًا.
  @else
    هذا الملحق جزء لا يتجزأ من العقد رقم <strong class="ltr">{{ $serialNumber }}</strong>، ويُقرأ ويُفسر معه كوحدة واحدة.
  @endif
</div>

@if(count($annex['sections']))
<div class="contract-data">
  @foreach($annex['sections'] as $section)
    <div class="data-section">
      <h2>{{ $section['title'] }}</h2>
      @if(count($section['items']))
        <table class="data-grid">
          @foreach(array_chunk($section['items'], 2) as $pair)
            <tr>
              @foreach($pair as $item)
                <td><div class="data-label">{{ $item['label'] }}</div><div class="data-value {{ $item['ltr'] ? 'ltr' : '' }}">{!! nl2br(e($item['value'])) !!}</div></td>
              @endforeach
              @if(count($pair) === 1)<td class="empty"></td>@endif
            </tr>
          @endforeach
        </table>
      @endif
      @foreach($section['repeaters'] as $repeater)
        <div class="repeater-title">{{ $repeater['title'] }}</div>
        <table class="repeater">
          <thead><tr>@foreach($repeater['columns'] as $column)<th>{{ $column['label'] }}</th>@endforeach</tr></thead>
          <tbody>@foreach($repeater['rows'] as $row)<tr>@foreach($row as $value)<td>{{ $value }}</td>@endforeach</tr>@endforeach</tbody>
        </table>
      @endforeach
    </div>
  @endforeach
</div>
@endif

@foreach($annex['clauses'] as $index=>$clause)
  @if(trim((string)($clause['bodyAr'] ?? '')) !== '')
  <div class="clause"><h2>{{ $clause['titleAr'] ?: ('البند '.($index+1)) }}</h2><p>{{ $clause['bodyAr'] }}</p></div>
  @endif
@endforeach

<div class="signatures">
  <div class="signatures-title">التوقيعات على الملحق</div>
  <table class="signature-table"><tr>
    @foreach($parties as $party)
    <td class="signature-box">
      <div class="signature-role">{{ $party['label'] }}</div>
      <div class="signature-name">الاسم: {{ ($annex['manualFill'] ?? false) ? '................................................' : ($party['name'] ?: '................................................') }}</div>
      @if($identitySignatureLayout ?? false)
        <div class="signature-line">الصفة: ................................................</div>
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
      @elseif($rentalSignatureLayout ?? null)
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
      @elseif($saleSignatureLayout ?? false)
        @if(!($annex['manualFill'] ?? false))<div class="signature-line">الصفة: {{ $party['capacity'] ?? '................................................' }}</div>@else<div class="signature-line">الصفة: ................................................</div>@endif
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">البصمة: ................................................</div>
      @else
        <div class="signature-line">التوقيع: ................................................</div>
        <div class="signature-line">التاريخ: .... / .... / ........</div>
      @endif
    </td>
    @endforeach
  </tr></table>
</div>
<div class="final-note">{{ ($annex['manualFill'] ?? false) ? 'قالب ملحق للتعبئة اليدوية — لا يتضمن بيانات المستخدم تلقائيًا.' : 'تم توليد هذا الملحق من بيانات العقد المعتمدة، ويُقرأ معه كوحدة واحدة.' }}</div>
@endforeach
</body>
</html>
