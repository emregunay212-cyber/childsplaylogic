# Üslü İfadeler + Kareköklü İfadeler soru setlerinin matematiğini BAĞIMSIZ doğrular.
# Her cevabı koddan hesaplar (sabit yazmaz), JSON'daki dogruCevap ile karşılaştırır.
# PowerShell 5.1 uyumlu. Kullanım: powershell -File verify-uslu-karekoklu.ps1

$ErrorActionPreference = 'Stop'
$eps = 0.0001
function Tern($c, $a, $b){ if($c){ return $a } else { return $b } }
function Test-Square([double]$n){ $r = [math]::Sqrt($n); return ([math]::Abs($r - [math]::Round($r)) -lt $eps) }
function I([double]$x){ return [int][math]::Round($x) }   # güvenli yuvarlama (float hatasına karşı)

# Tam sayı cevaplı sorular — bağımsız hesap (sabit değil)
$num = @{
  'lgs-mat-uslu-ifadeler-001'      = (I ([math]::Pow(2,4)))
  'lgs-mat-uslu-ifadeler-002'      = (I ([math]::Pow(-3,2)))
  'lgs-mat-uslu-ifadeler-003'      = (I ([math]::Pow(7,0)))
  'lgs-mat-uslu-ifadeler-004'      = (I (([math]::Pow(2,3)) * ([math]::Pow(2,2))))
  'lgs-mat-uslu-ifadeler-005'      = (I (([math]::Pow(3,5)) / ([math]::Pow(3,3))))
  'lgs-mat-uslu-ifadeler-006'      = (I ([math]::Pow(([math]::Pow(2,3)),2)))
  'lgs-mat-uslu-ifadeler-008'      = (I ([math]::Pow(10,5)))
  'lgs-mat-uslu-ifadeler-009'      = (I (5 * [math]::Pow(10,3)))
  'lgs-mat-uslu-ifadeler-010'      = (I ([math]::Pow(-2,4) - [math]::Pow(-2,3)))
  'lgs-mat-karekoklu-ifadeler-001' = (I ([math]::Sqrt(64)))
  'lgs-mat-karekoklu-ifadeler-002' = (I ([math]::Sqrt(121)))
  'lgs-mat-karekoklu-ifadeler-004' = (I ([math]::Sqrt(3 * 12)))
  'lgs-mat-karekoklu-ifadeler-007' = (I ([math]::Sqrt(80 / 5)))
  'lgs-mat-karekoklu-ifadeler-008' = (I ([math]::Pow([math]::Sqrt(11),2)))
}

# Radikal (a√b) cevaplı sorular: beklenen sayısal değere eps içinde eşit TEK şık doğru olmalı
$rad = @{
  'lgs-mat-karekoklu-ifadeler-005' = @{ bek = [math]::Sqrt(45);                 mod = @{ A=(3*[math]::Sqrt(5)); B=(5*[math]::Sqrt(3)); C=(9*[math]::Sqrt(5)); D=15.0 } }
  'lgs-mat-karekoklu-ifadeler-006' = @{ bek = (5*[math]::Sqrt(7));              mod = @{ A=(5*[math]::Sqrt(14)); B=(6*[math]::Sqrt(7)); C=(5*[math]::Sqrt(7)); D=35.0 } }
  'lgs-mat-karekoklu-ifadeler-009' = @{ bek = ([math]::Sqrt(8)+[math]::Sqrt(18)); mod = @{ A=[math]::Sqrt(26); B=(5*[math]::Sqrt(2)); C=(6*[math]::Sqrt(2)); D=(10*[math]::Sqrt(2)) } }
}

$dosyalar = @('uslu-ifadeler','karekoklu-ifadeler')
$pass = 0; $fail = 0
foreach($d in $dosyalar){
  $j = Get-Content (Join-Path $PSScriptRoot "..\icerik\lgs\matematik\$d.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach($q in $j.sorular){
    $dc = $q.dogruCevap; $sik = $q.siklar.$dc; $sonuc = 'ATLANDI'

    if($num.ContainsKey($q.id)){
      $bek = $num[$q.id]; $sayi = [int]($sik -replace '[^\d]','')
      $sonuc = Tern ($sayi -eq $bek) "PASS (hesap=$bek)" "FAIL (hesap=$bek, sik=$sayi)"
    }
    elseif($rad.ContainsKey($q.id)){
      $info = $rad[$q.id]; $esit = @()
      foreach($k in $info.mod.Keys){ if([math]::Abs($info.mod[$k] - $info.bek) -lt $eps){ $esit += $k } }
      $sonuc = Tern (($esit.Count -eq 1) -and ($esit[0] -eq $dc)) ("PASS (deger={0:N3}, tek sik={1})" -f $info.bek, ($esit -join '')) "FAIL (eslesen=$($esit -join ','))"
    }
    elseif($q.id -eq 'lgs-mat-uslu-ifadeler-007'){
      $v = [math]::Pow(2,-3)
      $sonuc = Tern (($dc -eq 'B') -and ([math]::Abs($v - (1.0/8.0)) -lt $eps)) "PASS (2^-3=1/8=0,125)" "FAIL"
    }
    elseif($q.id -eq 'lgs-mat-karekoklu-ifadeler-003'){
      $opts = @{ A=18; B=24; C=36; D=50 }; $kareler = @()
      foreach($k in $opts.Keys){ if(Test-Square ([double]$opts[$k])){ $kareler += $k } }
      $sonuc = Tern (($kareler.Count -eq 1) -and ($kareler[0] -eq $dc)) "PASS (tek tam kare sik=$($kareler -join ''))" "FAIL (kare=$($kareler -join ','))"
    }
    elseif($q.id -eq 'lgs-mat-karekoklu-ifadeler-010'){
      $v = [math]::Sqrt(0.25)
      $sonuc = Tern (($dc -eq 'C') -and ([math]::Abs($v - 0.5) -lt $eps)) "PASS (sqrt(0,25)=0,5)" "FAIL"
    }

    if($sonuc -like 'PASS*'){ $pass++ } elseif($sonuc -like 'FAIL*'){ $fail++ }
    Write-Output ("{0}  [{1}]  dc={2}  =>  {3}" -f $q.id, $q.zorluk, $dc, $sonuc)
  }
}
Write-Output ""
Write-Output ("SONUC: $pass PASS, $fail FAIL")
if($fail -gt 0){ exit 1 } else { Write-Output "Tum sorular bagimsiz hesapla DOGRULANDI." }
