const fs = require('fs');
const file = 'c:\\\\Users\\\\junai\\\\Downloads\\\\stitch_guardian_senior_health (1)\\\\mobile-app\\\\emergency_sos.html';
let html = fs.readFileSync(file, 'utf8');

// The main blocks to reorder inside <main>...</main>
// We can find <main> and </main>
const mainStart = html.indexOf('<main ');
const mainContentStart = html.indexOf('>', mainStart) + 1;
const mainEnd = html.indexOf('</main>');

const beforeMain = html.substring(0, mainContentStart);
const afterMain = html.substring(mainEnd);
const mainContent = html.substring(mainContentStart, mainEnd);

// Identify sections
const sections = {
    intro: mainContent.match(/<section class="flex flex-col items-center justify-center text-center[\s\S]*?<\/section>/)[0],
    guardians: mainContent.match(/<!-- Comprehensive Guardians Section -->[\s\S]*?<\/section>/)[0],
    cctv: mainContent.match(/<!-- CCTV Camera Card -->[\s\S]*?<\/section>/)[0],
    fall: mainContent.match(/<!-- Fall Detection Card -->[\s\S]*?<\/section>/)[0],
    fire: mainContent.match(/<!-- Fire & Smoke Detection Card -->[\s\S]*?<\/section>/)[0],
    secondary: mainContent.match(/<!-- Secondary Support Actions -->[\s\S]*?<\/section>/)[0],
    trigger: mainContent.match(/<!-- Safety Trigger \(Specialty Component\) -->[\s\S]*?<\/section>/)[0],
    location: mainContent.match(/<!-- Location \+ Geofencing Card -->[\s\S]*?<\/section>/)[0]
};

// Update 3D styles on Box icons (CCTV, Fall, Fire, Location)
// Replace bg-blue-50 with 3D gradient
sections.cctv = sections.cctv.replace('bg-blue-50 rounded-full flex', 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(0,0,0,0.2)] rounded-full flex text-white border-0');
sections.cctv = sections.cctv.replace('text-primary', 'text-white');

sections.fall = sections.fall.replace('bg-orange-50 rounded-full flex', 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(0,0,0,0.2)] rounded-full flex text-white border-0');
sections.fall = sections.fall.replace('text-orange-500', 'text-white');

sections.fire = sections.fire.replace('bg-red-50 rounded-full flex', 'bg-gradient-to-br from-red-400 to-red-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(0,0,0,0.2)] rounded-full flex text-white border-0');
sections.fire = sections.fire.replace('text-red-500', 'text-white');

sections.location = sections.location.replace('bg-primary-fixed/50 flex', 'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(0,0,0,0.2)] flex text-white');
sections.location = sections.location.replace('text-on-primary-container', 'text-white');

// Make SOS buttons 3D and same color
// Secondary actions (Call 911, Medical ID)
const sos3dClasses = 'bg-gradient-to-br from-[#ff5449] to-[#ba1a1a] shadow-[inset_0_2px_8px_rgba(255,255,255,0.4),_0_10px_20px_rgba(186,26,26,0.3)] border-0 text-white';
sections.secondary = sections.secondary.replace(/bg-surface-container-high border border-surface-variant active:bg-surface-variant transition-colors shadow-sm/g, sos3dClasses + ' active:scale-95 transition-all');
// Change text-primary and text-on-surface to text-white for secondary
sections.secondary = sections.secondary.replace(/text-primary/g, 'text-white').replace(/text-on-surface/g, 'text-white');

// We need to reorder sequence: 1 SOS Button, 2 Map, 3 CCTV, 4 Fire, 5 Fall, 6 Contacts, 7 Helpline numbers
// trigger = SOS Button
// location = Map
// cctv = CCTV
// fire = Fire
// fall = Fall
// guardians = Contacts
// secondary = Helpline numbers

const newMainContent = `\n` + 
    sections.intro + `\n\n` +
    sections.trigger + `\n\n` +
    sections.location + `\n\n` +
    sections.cctv + `\n\n` +
    sections.fire + `\n\n` +
    sections.fall + `\n\n` +
    sections.guardians + `\n\n` +
    sections.secondary + `\n`;

const finalHtml = beforeMain + newMainContent + afterMain;
fs.writeFileSync(file, finalHtml);
console.log('Done rewriting emergency_sos.html');
