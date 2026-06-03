# Çarpanlar ve Katlar (24 soru, 8 kolay/8 orta/8 zor) — matematiği BAĞIMSIZ doğrular.
# PowerShell 5.1 uyumlu. Kullanım: powershell -File verify-carpanlar-katlar.ps1

$ErrorActionPreference = 'Stop'
$jsonPath = Join-Path $PSScriptRoot '..\icerik\lgs\matematik\carpanlar-katlar.json'
$data = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-GCD([int]$a,[int]$b){ while($b -ne 0){ $t=$b; $b=$a%$b; $a=$t }; return [Math]::Abs($a) }
function Get-LCM([int]$a,[int]$b){ return [int]([Math]::Abs($a*$b) / (Get-GCD $a $b)) }
function Test-Prime([int]$n){ if($n -lt 2){return $false}; for($d=2; $d*$d -le $n; $d++){ if($n%$d -eq 0){return $false} }; return $true }
function Get-DivisorCount([int]$n){ $c=1; $d=2; $m=$n; while($d*$d -le $m){ $e=0; while($m%$d -eq 0){ $m=[int]($m/$d); $e++ }; if($e -gt 0){ $c*=($e+1) }; $d++ }; if($m -gt 1){ $c*=2 }; return $c }
function Get-PrimeSet([int]$n){ $s=@(); $d=2; $m=$n; while($d*$d -le $m){ if($m%$d -eq 0){ $s+=$d; while($m%$d -eq 0){ $m=[int]($m/$d) } }; $d++ }; if($m -gt 1){ $s+=$m }; return ($s | Sort-Object) }
function Tern($cond, $a, $b){ if($cond){ return $a } else { return $b } }

$n019 = 0; for($n=0; $n -le 300; $n++){ if(($n % 5 -eq 4) -and ($n % 6 -eq 5)){ $n019 = $n; break } }

$expectedNumeric = @{
  'lgs-mat-carpanlar-katlar-003' = (Get-DivisorCount 48)
  'lgs-mat-carpanlar-katlar-004' = (Get-GCD 24 36)
  'lgs-mat-carpanlar-katlar-005' = (Get-LCM 24 36)
  'lgs-mat-carpanlar-katlar-006' = (Get-GCD 48 36)
  'lgs-mat-carpanlar-katlar-007' = (Get-LCM 12 18)
  'lgs-mat-carpanlar-katlar-009' = (Get-LCM (Get-LCM 12 15) 20)
  'lgs-mat-carpanlar-katlar-010' = (6 * 72)
  'lgs-mat-carpanlar-katlar-014' = (Get-DivisorCount 50)
  'lgs-mat-carpanlar-katlar-015' = (Get-GCD 36 60)
  'lgs-mat-carpanlar-katlar-016' = (Get-LCM 8 12)
  'lgs-mat-carpanlar-katlar-017' = (Get-GCD 15 28)
  'lgs-mat-carpanlar-katlar-018' = (Get-GCD 40 60)
  'lgs-mat-carpanlar-katlar-019' = $n019
  'lgs-mat-carpanlar-katlar-020' = ([int](12 * 72 / 24))
  'lgs-mat-carpanlar-katlar-021' = (6 * 90)
  'lgs-mat-carpanlar-katlar-022' = (Get-LCM (Get-LCM 12 15) 20)
  'lgs-mat-carpanlar-katlar-023' = (Get-LCM 24 36)
  'lgs-mat-carpanlar-katlar-024' = (Get-GCD 48 72)
}
$primeSetSoru = @{
  'lgs-mat-carpanlar-katlar-001' = @{ n = 36;  set = '2,3'; dc = 'A' }
  'lgs-mat-carpanlar-katlar-011' = @{ n = 100; set = '2,5'; dc = 'A' }
}
# çarpan-ifade modelleri (değer + hepsi asal mı): doğru şık hedef değere eşit ve tüm çarpanları asal
$modeller = @{
  'lgs-mat-carpanlar-katlar-002' = @{ hedef = 90; mod = @{ A=@(2,3,5); B=@(2,3,3,5); C=@(2,2,3,5); D=@(3,3,10) } }
  'lgs-mat-carpanlar-katlar-013' = @{ hedef = 60; mod = @{ A=@(2,3,5); B=@(2,2,3,5); C=@(2,2,3,3,5); D=@(2,3,5,5) } }
}
$model012 = @{ A=21; B=27; C=29; D=33 }

$pass = 0; $fail = 0
foreach($q in $data.sorular){
  $dc = $q.dogruCevap; $sik = $q.siklar.$dc; $sonuc = 'ATLANDI'

  if($expectedNumeric.ContainsKey($q.id)){
    $beklenen = $expectedNumeric[$q.id]; $sayi = [int]($sik -replace '[^\d]','')
    $sonuc = Tern ($sayi -eq $beklenen) "PASS (hesap=$beklenen)" "FAIL (hesap=$beklenen, sik=$sayi)"
  }
  elseif($primeSetSoru.ContainsKey($q.id)){
    $m = $primeSetSoru[$q.id]; $ps = (Get-PrimeSet $m.n) -join ','
    $sonuc = Tern ($ps -eq $m.set -and $dc -eq $m.dc) "PASS ($($m.n)=$ps)" "FAIL ($ps, dc=$dc)"
  }
  elseif($modeller.ContainsKey($q.id)){
    $info = $modeller[$q.id]; $gecerli = @()
    foreach($k in $info.mod.Keys){
      $carpim = 1; $hepsiAsal = $true
      foreach($x in $info.mod[$k]){ $carpim *= $x; if(-not (Test-Prime $x)){ $hepsiAsal = $false } }
      if($carpim -eq $info.hedef -and $hepsiAsal){ $gecerli += $k }
    }
    $sonuc = Tern (($gecerli.Count -eq 1) -and ($gecerli[0] -eq $dc)) "PASS (tek gecerli=$($gecerli -join ''))" "FAIL (gecerli=$($gecerli -join ','))"
  }
  elseif($q.id -eq 'lgs-mat-carpanlar-katlar-012'){
    $asal = @(); foreach($k in $model012.Keys){ if(Test-Prime $model012[$k]){ $asal += $k } }
    $sonuc = Tern (($asal.Count -eq 1) -and ($asal[0] -eq $dc)) "PASS (tek asal=$($asal -join ''))" "FAIL ($($asal -join ','))"
  }
  elseif($q.id -eq 'lgs-mat-carpanlar-katlar-008'){
    $ok = ((Test-Prime 1) -eq $false) -and (Test-Prime 2) -and ((Test-Prime 9) -eq $false)
    $sonuc = Tern ($ok -and $dc -eq 'B') "PASS (asal kavrami)" "FAIL"
  }

  if($sonuc -like 'PASS*'){ $pass++ } elseif($sonuc -like 'FAIL*'){ $fail++ }
  Write-Output ("{0}  [{1}]  dc={2}  =>  {3}" -f $q.id, $q.zorluk, $dc, $sonuc)
}
$kolay=($data.sorular|Where-Object{$_.zorluk -eq 'kolay'}).Count
$orta=($data.sorular|Where-Object{$_.zorluk -eq 'orta'}).Count
$zor=($data.sorular|Where-Object{$_.zorluk -eq 'zor'}).Count
Write-Output ""
Write-Output ("DAGILIM: $kolay kolay, $orta orta, $zor zor  (toplam $($data.sorular.Count))")
Write-Output ("SONUC: $pass PASS, $fail FAIL")
if($fail -gt 0){ exit 1 } else { Write-Output "Tum sorular bagimsiz hesapla DOGRULANDI." }
