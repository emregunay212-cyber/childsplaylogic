// Ateş & Buz başlatıcı — index.html'in eski satır içi <script type="module"> gövdesi (B6: satır içi script 0, CSP B9).
// start() tekilliği kendi içinde garanti eder (main.js window.__AB_STARTED); yedek 'load' dinleyicisi main.js'te.
import { start } from './main.js?v=5';
start().catch(err => console.error('Ateş & Buz başlatılamadı:', err));
