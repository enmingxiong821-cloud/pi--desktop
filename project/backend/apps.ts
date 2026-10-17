import { execFile, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { t } from './i18n.js';

export type AppKind = 'video' | '3d' | 'design' | 'audio' | 'engine' | 'dev' | 'office' | 'browser' | 'system';

const APP_KINDS: AppKind[] = ['video', '3d', 'design', 'audio', 'engine', 'dev', 'office', 'browser', 'system'];

export interface LocalAppInfo {
  id: string;
  name: string;
  kind: AppKind;
  installed: boolean;
  path?: string;
  hint: string;
  custom?: boolean;
  /** 开始菜单扫描发现的本机软件（非内置目录） */
  discovered?: boolean;
  /** 内置 winget 包 ID；存在时可一键安装 */
  installId?: string;
}

interface AppDefinition {
  id: string;
  name: string;
  kind: AppKind;
  exe: string;
  hint: string;
  paths: string[];
  scans?: Array<{ root: string; pattern: RegExp; sub: string[] }>;
  appPath?: string;
  projectArg?: 'projectPath' | 'file';
  /** winget 包 ID：由用户点击「安装」后才执行，不自动安装 */
  install?: { winget: string };
}

const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
const programFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const localAppData = process.env.LOCALAPPDATA || '';

function adobe(): string {
  return path.join(programFiles, 'Adobe');
}

const APPS: AppDefinition[] = [
  {
    id: 'premiere',
    name: 'Premiere Pro',
    kind: 'video',
    exe: 'Adobe Premiere Pro.exe',
    hint: 'Adobe Premiere Pro',
    paths: [],
    scans: [{ root: adobe(), pattern: /^Adobe Premiere Pro \d{4}$/, sub: ['Adobe Premiere Pro.exe'] }],
    appPath: 'Adobe Premiere Pro.exe',
  },
  {
    id: 'aftereffects',
    name: 'After Effects',
    kind: 'video',
    exe: 'AfterFX.exe',
    hint: 'Adobe After Effects',
    paths: [],
    scans: [{ root: adobe(), pattern: /^Adobe After Effects \d{4}$/, sub: ['AfterFX.exe'] }],
    appPath: 'AfterFX.exe',
  },
  {
    id: 'audition',
    name: 'Audition',
    kind: 'audio',
    exe: 'Adobe Audition.exe',
    hint: 'Adobe Audition',
    paths: [],
    scans: [{ root: adobe(), pattern: /^Adobe Audition \d{4}$/, sub: ['Adobe Audition.exe'] }],
    appPath: 'Adobe Audition.exe',
  },
  {
    id: 'photoshop',
    name: 'Photoshop',
    kind: 'design',
    exe: 'Photoshop.exe',
    hint: 'Adobe Photoshop',
    paths: [],
    scans: [{ root: adobe(), pattern: /^Adobe Photoshop \d{4}$/, sub: ['Photoshop.exe'] }],
    appPath: 'Photoshop.exe',
  },
  {
    id: 'illustrator',
    name: 'Illustrator',
    kind: 'design',
    exe: 'Illustrator.exe',
    hint: 'Adobe Illustrator',
    paths: [],
    scans: [{ root: adobe(), pattern: /^Adobe Illustrator \d{4}$/, sub: ['Support Files', 'Contents', 'Windows', 'Illustrator.exe'] }],
    appPath: 'Illustrator.exe',
  },
  {
    id: 'resolve',
    name: 'DaVinci Resolve',
    kind: 'video',
    exe: 'Resolve.exe',
    hint: 'Blackmagic Design DaVinci Resolve',
    paths: [path.join(programFiles, 'Blackmagic Design', 'DaVinci Resolve', 'Resolve.exe')],
    appPath: 'Resolve.exe',
    install: { winget: 'BlackmagicDesign.DaVinciResolve' },
  },
  {
    id: 'capcut',
    name: '剪映专业版',
    kind: 'video',
    exe: 'JianyingPro.exe',
    hint: '剪映专业版（CapCut 国内版）',
    paths: localAppData ? [path.join(localAppData, 'JianyingPro', 'Apps', 'JianyingPro.exe')] : [],
    scans: localAppData
      ? [{ root: path.join(localAppData, 'JianyingPro', 'Apps'), pattern: /^\d+\.\d+/, sub: ['JianyingPro.exe'] }]
      : [],
  },
  {
    id: 'capcut-intl',
    name: 'CapCut',
    kind: 'video',
    exe: 'CapCut.exe',
    hint: 'CapCut 国际版',
    paths: localAppData ? [path.join(localAppData, 'CapCut', 'Apps', 'CapCut.exe')] : [],
  },
  {
    id: 'obs',
    name: 'OBS Studio',
    kind: 'video',
    exe: 'obs64.exe',
    hint: 'OBS Studio',
    paths: [path.join(programFiles, 'obs-studio', 'bin', '64bit', 'obs64.exe')],
    appPath: 'obs64.exe',
    install: { winget: 'OBSProject.OBSStudio' },
  },
  {
    id: 'blender',
    name: 'Blender',
    kind: '3d',
    exe: 'blender.exe',
    hint: 'Blender Foundation',
    paths: [
      path.join(programFiles, 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe'),
      path.join(programFiles86, 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe'),
    ],
    scans: [{ root: path.join(programFiles, 'Blender Foundation'), pattern: /^Blender \d/, sub: ['blender.exe'] }],
    appPath: 'blender.exe',
    install: { winget: 'BlenderFoundation.Blender' },
    projectArg: 'file',
  },
  {
    id: 'cinema4d',
    name: 'Cinema 4D',
    kind: '3d',
    exe: 'Cinema 4D.exe',
    hint: 'Maxon Cinema 4D',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Maxon Cinema 4D'), pattern: /^\d+\.\d+/, sub: ['Cinema 4D.exe'] }],
    appPath: 'Cinema 4D.exe',
    projectArg: 'file',
  },
  {
    id: 'maya',
    name: 'Maya',
    kind: '3d',
    exe: 'maya.exe',
    hint: 'Autodesk Maya',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Autodesk'), pattern: /^Maya\d{4}$/, sub: ['bin', 'maya.exe'] }],
    appPath: 'maya.exe',
    projectArg: 'file',
  },
  {
    id: '3dsmax',
    name: '3ds Max',
    kind: '3d',
    exe: '3dsmax.exe',
    hint: 'Autodesk 3ds Max',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Autodesk'), pattern: /^3ds Max \d{4}$/, sub: ['3dsmax.exe'] }],
    appPath: '3dsmax.exe',
    projectArg: 'file',
  },
  {
    id: 'freecad',
    name: 'FreeCAD',
    kind: '3d',
    exe: 'FreeCAD.exe',
    hint: 'FreeCAD',
    paths: [],
    scans: [{ root: programFiles, pattern: /^FreeCAD /, sub: ['bin', 'FreeCAD.exe'] }],
    appPath: 'FreeCAD.exe',
    install: { winget: 'FreeCAD.FreeCAD' },
    projectArg: 'file',
  },
  {
    id: 'unity',
    name: 'Unity Editor',
    kind: 'engine',
    exe: 'Unity.exe',
    hint: 'Unity Hub 安装的编辑器',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Unity', 'Hub', 'Editor'), pattern: /^\d+\.\d+/, sub: ['Editor', 'Unity.exe'] }],
    projectArg: 'projectPath',
  },
  {
    id: 'unreal',
    name: 'Unreal Editor',
    kind: 'engine',
    exe: 'UnrealEditor.exe',
    hint: 'Epic Games Launcher 安装的 UE',
    paths: [],
    scans: [{
      root: path.join(programFiles, 'Epic Games'),
      pattern: /^UE_\d+\.\d+$/,
      sub: ['Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'],
    }],
    projectArg: 'file',
  },
  {
    id: 'figma',
    name: 'Figma',
    kind: 'design',
    exe: 'Figma.exe',
    hint: 'Figma 桌面端',
    paths: localAppData ? [path.join(localAppData, 'Figma', 'Figma.exe')] : [],
    install: { winget: 'Figma.Figma' },
  },
  {
    id: 'vlc',
    name: 'VLC',
    kind: 'video',
    exe: 'vlc.exe',
    hint: 'VLC media player',
    paths: [
      path.join(programFiles, 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(programFiles86, 'VideoLAN', 'VLC', 'vlc.exe'),
    ],
    appPath: 'vlc.exe',
    install: { winget: 'VideoLAN.VLC' },
  },
  {
    id: 'potplayer',
    name: 'PotPlayer',
    kind: 'video',
    exe: 'PotPlayerMini64.exe',
    hint: 'Daum PotPlayer',
    paths: [path.join(programFiles, 'DAUM', 'PotPlayer', 'PotPlayerMini64.exe')],
    appPath: 'PotPlayerMini64.exe',
    install: { winget: 'Daum.PotPlayer' },
  },
  {
    id: 'audacity',
    name: 'Audacity',
    kind: 'audio',
    exe: 'Audacity.exe',
    hint: 'Audacity',
    paths: [path.join(programFiles, 'Audacity', 'Audacity.exe')],
    appPath: 'Audacity.exe',
    install: { winget: 'Audacity.Audacity' },
  },
  {
    id: 'reaper',
    name: 'REAPER',
    kind: 'audio',
    exe: 'reaper.exe',
    hint: 'REAPER',
    paths: [path.join(programFiles, 'REAPER (x64)', 'reaper.exe')],
    appPath: 'reaper.exe',
    install: { winget: 'Cockos.REAPER' },
  },
  {
    id: 'flstudio',
    name: 'FL Studio',
    kind: 'audio',
    exe: 'FL64.exe',
    hint: 'Image-Line FL Studio',
    paths: [path.join(programFiles, 'Image-Line', 'FL Studio 21', 'FL64.exe')],
    scans: [{ root: path.join(programFiles, 'Image-Line'), pattern: /^FL Studio/, sub: ['FL64.exe'] }],
    install: { winget: 'ImageLine.FLStudio' },
  },
  {
    id: 'cubase',
    name: 'Cubase',
    kind: 'audio',
    exe: 'Cubase14.exe',
    hint: 'Steinberg Cubase',
    paths: [],
    scans: [{
      root: path.join(programFiles, 'Steinberg'),
      pattern: /^Cubase \d+/,
      sub: ['Cubase14.exe'],
    }],
  },
  {
    id: 'gimp',
    name: 'GIMP',
    kind: 'design',
    exe: 'gimp-2.10.exe',
    hint: 'GNU Image Manipulation Program',
    paths: [path.join(programFiles, 'GIMP 2', 'bin', 'gimp-2.10.exe')],
    install: { winget: 'GIMP.GIMP' },
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    kind: 'design',
    exe: 'inkscape.exe',
    hint: 'Inkscape',
    paths: [path.join(programFiles, 'Inkscape', 'bin', 'inkscape.exe')],
    appPath: 'inkscape.exe',
    install: { winget: 'Inkscape.Inkscape' },
  },
  {
    id: 'krita',
    name: 'Krita',
    kind: 'design',
    exe: 'krita.exe',
    hint: 'Krita',
    paths: [path.join(programFiles, 'Krita (x64)', 'bin', 'krita.exe')],
    appPath: 'krita.exe',
    install: { winget: 'KDE.Krita' },
  },
  {
    id: 'sketchup',
    name: 'SketchUp',
    kind: '3d',
    exe: 'SketchUp.exe',
    hint: 'Trimble SketchUp',
    paths: [],
    scans: [{ root: path.join(programFiles, 'SketchUp'), pattern: /^SketchUp \d{4}$/, sub: ['SketchUp.exe'] }],
    projectArg: 'file',
  },
  {
    id: 'rhino',
    name: 'Rhino',
    kind: '3d',
    exe: 'Rhino.exe',
    hint: 'Rhinoceros 3D',
    paths: [],
    scans: [{ root: programFiles, pattern: /^Rhino \d/, sub: ['System', 'Rhino.exe'] }],
    projectArg: 'file',
  },
  {
    id: 'zbrush',
    name: 'ZBrush',
    kind: '3d',
    exe: 'ZBrush.exe',
    hint: 'Maxon ZBrush',
    paths: [],
    scans: [{ root: programFiles, pattern: /^Maxon ZBrush/, sub: ['ZBrush.exe'] }],
    projectArg: 'file',
  },
  {
    id: 'substance-painter',
    name: 'Substance 3D Painter',
    kind: '3d',
    exe: 'Adobe Substance 3D Painter.exe',
    hint: 'Adobe Substance 3D Painter',
    paths: [],
    scans: [{
      root: adobe(),
      pattern: /^Adobe Substance 3D Painter$/,
      sub: ['Adobe Substance 3D Painter.exe'],
    }],
    appPath: 'Adobe Substance 3D Painter.exe',
    projectArg: 'file',
  },
  {
    id: 'houdini',
    name: 'Houdini',
    kind: '3d',
    exe: 'houdini.exe',
    hint: 'SideFX Houdini',
    paths: [],
    scans: [{
      root: path.join(programFiles, 'Side Effects Software'),
      pattern: /^Houdini \d/,
      sub: ['bin', 'houdini.exe'],
    }],
    projectArg: 'file',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    kind: 'dev',
    exe: 'Code.exe',
    hint: 'Visual Studio Code',
    paths: localAppData ? [path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe')] : [],
    appPath: 'Code.exe',
    install: { winget: 'Microsoft.VisualStudioCode' },
  },
  {
    id: 'cursor-ide',
    name: 'Cursor',
    kind: 'dev',
    exe: 'Cursor.exe',
    hint: 'Cursor 编辑器',
    paths: localAppData ? [path.join(localAppData, 'Programs', 'cursor', 'Cursor.exe')] : [],
    appPath: 'Cursor.exe',
    install: { winget: 'Anysphere.Cursor' },
  },
  {
    id: 'android-studio',
    name: 'Android Studio',
    kind: 'dev',
    exe: 'studio64.exe',
    hint: 'Android Studio',
    paths: [path.join(programFiles, 'Android', 'Android Studio', 'bin', 'studio64.exe')],
    appPath: 'studio64.exe',
    install: { winget: 'Google.AndroidStudio' },
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    kind: 'dev',
    exe: 'idea64.exe',
    hint: 'JetBrains IntelliJ IDEA',
    paths: [],
    scans: localAppData
      ? [{ root: path.join(localAppData, 'Programs'), pattern: /^IntelliJ IDEA/, sub: ['bin', 'idea64.exe'] }]
      : [],
    install: { winget: 'JetBrains.IntelliJIDEA.Community' },
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    kind: 'dev',
    exe: 'pycharm64.exe',
    hint: 'JetBrains PyCharm',
    paths: [],
    scans: [
      ...(localAppData ? [{ root: path.join(localAppData, 'Programs'), pattern: /^PyCharm/, sub: ['bin', 'pycharm64.exe'] }] : []),
      ...(localAppData ? [{ root: path.join(localAppData, 'JetBrains'), pattern: /^PyCharm/, sub: ['bin', 'pycharm64.exe'] }] : []),
    ],
    install: { winget: 'JetBrains.PyCharm.Community' },
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    kind: 'dev',
    exe: 'webstorm64.exe',
    hint: 'JetBrains WebStorm',
    paths: [],
    scans: localAppData
      ? [{ root: path.join(localAppData, 'Programs'), pattern: /^WebStorm/, sub: ['bin', 'webstorm64.exe'] }]
      : [],
    install: { winget: 'JetBrains.WebStorm' },
  },
  {
    id: 'visualstudio',
    name: 'Visual Studio 2022',
    kind: 'dev',
    exe: 'devenv.exe',
    hint: 'Visual Studio 2022',
    paths: [],
    scans: [{
      root: path.join(programFiles, 'Microsoft Visual Studio', '2022'),
      pattern: /^(Community|Professional|Enterprise)$/,
      sub: ['Common7', 'IDE', 'devenv.exe'],
    }],
    appPath: 'devenv.exe',
    install: { winget: 'Microsoft.VisualStudio.2022.Community' },
  },
  {
    id: 'gitbash',
    name: 'Git Bash',
    kind: 'dev',
    exe: 'git-bash.exe',
    hint: 'Git for Windows',
    paths: [path.join(programFiles, 'Git', 'git-bash.exe')],
    install: { winget: 'Git.Git' },
  },
  {
    id: 'windows-terminal',
    name: 'Windows Terminal',
    kind: 'system',
    exe: 'wt.exe',
    hint: 'Windows Terminal',
    paths: localAppData ? [path.join(localAppData, 'Microsoft', 'WindowsApps', 'wt.exe')] : [],
    appPath: 'wt.exe',
    install: { winget: 'Microsoft.WindowsTerminal' },
  },
  {
    id: 'word',
    name: 'Word',
    kind: 'office',
    exe: 'WINWORD.EXE',
    hint: 'Microsoft Word',
    paths: [path.join(programFiles, 'Microsoft Office', 'root', 'Office16', 'WINWORD.EXE')],
    appPath: 'WINWORD.EXE',
    projectArg: 'file',
  },
  {
    id: 'excel',
    name: 'Excel',
    kind: 'office',
    exe: 'EXCEL.EXE',
    hint: 'Microsoft Excel',
    paths: [path.join(programFiles, 'Microsoft Office', 'root', 'Office16', 'EXCEL.EXE')],
    appPath: 'EXCEL.EXE',
    projectArg: 'file',
  },
  {
    id: 'powerpoint',
    name: 'PowerPoint',
    kind: 'office',
    exe: 'POWERPNT.EXE',
    hint: 'Microsoft PowerPoint',
    paths: [path.join(programFiles, 'Microsoft Office', 'root', 'Office16', 'POWERPNT.EXE')],
    appPath: 'POWERPNT.EXE',
    projectArg: 'file',
  },
  {
    id: 'wps',
    name: 'WPS Office',
    kind: 'office',
    exe: 'wps.exe',
    hint: 'WPS Office',
    paths: [],
    scans: localAppData
      ? [{ root: path.join(localAppData, 'Kingsoft', 'WPS Office'), pattern: /^\d/, sub: ['office6', 'wps.exe'] }]
      : [],
    install: { winget: 'Kingsoft.WPSOffice.CN' },
    projectArg: 'file',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    kind: 'browser',
    exe: 'chrome.exe',
    hint: 'Google Chrome',
    paths: [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    appPath: 'chrome.exe',
    install: { winget: 'Google.Chrome' },
  },
  {
    id: 'edge',
    name: 'Edge',
    kind: 'browser',
    exe: 'msedge.exe',
    hint: 'Microsoft Edge',
    paths: [path.join(programFiles86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')],
    appPath: 'msedge.exe',
    install: { winget: 'Microsoft.Edge' },
  },
  {
    id: 'firefox',
    name: 'Firefox',
    kind: 'browser',
    exe: 'firefox.exe',
    hint: 'Mozilla Firefox',
    paths: [path.join(programFiles, 'Mozilla Firefox', 'firefox.exe')],
    appPath: 'firefox.exe',
    install: { winget: 'Mozilla.Firefox' },
  },
  {
    id: '7zip',
    name: '7-Zip',
    kind: 'system',
    exe: '7zFM.exe',
    hint: '7-Zip File Manager',
    paths: [path.join(programFiles, '7-Zip', '7zFM.exe')],
    appPath: '7zFM.exe',
    install: { winget: '7zip.7zip' },
  },
  // ---------- 扩充的常用软件：覆盖剪辑、音频、建模、设计、开发、办公与系统工具 ----------
  {
    id: 'shotcut',
    name: 'Shotcut',
    kind: 'video',
    exe: 'shotcut.exe',
    hint: 'Shotcut 开源视频剪辑',
    paths: [path.join(programFiles, 'Shotcut', 'shotcut.exe')],
    appPath: 'shotcut.exe',
    install: { winget: 'Meltytech.Shotcut' },
    projectArg: 'file',
  },
  {
    id: 'handbrake',
    name: 'HandBrake',
    kind: 'video',
    exe: 'HandBrakeGUI.exe',
    hint: 'HandBrake 视频转码',
    paths: [path.join(programFiles, 'HandBrake', 'HandBrakeGUI.exe')],
    appPath: 'HandBrakeGUI.exe',
    install: { winget: 'HandBrake.HandBrake' },
  },
  {
    id: 'kdenlive',
    name: 'Kdenlive',
    kind: 'video',
    exe: 'kdenlive.exe',
    hint: 'KDE 非线性视频剪辑',
    paths: [path.join(programFiles, 'Kdenlive', 'bin', 'kdenlive.exe')],
    install: { winget: 'KDE.Kdenlive' },
    projectArg: 'file',
  },
  {
    id: 'filmora',
    name: 'Filmora',
    kind: 'video',
    exe: 'Filmora.exe',
    hint: 'Wondershare Filmora',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Wondershare'), pattern: /^Filmora/, sub: ['Filmora.exe'] }],
    install: { winget: 'Wondershare.Filmora' },
    projectArg: 'file',
  },
  {
    id: 'ableton',
    name: 'Ableton Live',
    kind: 'audio',
    exe: 'Ableton Live 12 Suite.exe',
    hint: 'Ableton Live',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Ableton'), pattern: /^Live/, sub: ['Program', 'Ableton Live 12 Suite.exe'] }],
    install: { winget: 'Ableton.Live' },
  },
  {
    id: 'studio-one',
    name: 'Studio One',
    kind: 'audio',
    exe: 'Studio One.exe',
    hint: 'PreSonus Studio One',
    paths: [],
    scans: [{ root: path.join(programFiles, 'PreSonus'), pattern: /^Studio One/, sub: ['Studio One.exe'] }],
    install: { winget: 'PreSonus.StudioOne' },
  },
  {
    id: 'godot',
    name: 'Godot',
    kind: 'engine',
    exe: 'Godot.exe',
    hint: 'Godot 引擎',
    paths: [],
    scans: [{ root: programFiles, pattern: /^Godot/, sub: ['Godot.exe'] }],
    appPath: 'Godot.exe',
    install: { winget: 'GodotEngine.GodotEngine' },
    projectArg: 'projectPath',
  },
  {
    id: 'autocad',
    name: 'AutoCAD',
    kind: '3d',
    exe: 'acad.exe',
    hint: 'Autodesk AutoCAD',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Autodesk'), pattern: /^AutoCAD \d{4}/, sub: ['acad.exe'] }],
    appPath: 'acad.exe',
    install: { winget: 'Autodesk.AutoCAD' },
    projectArg: 'file',
  },
  {
    id: 'fusion360',
    name: 'Fusion 360',
    kind: '3d',
    exe: 'Fusion360.exe',
    hint: 'Autodesk Fusion 360',
    paths: localAppData ? [path.join(localAppData, 'Autodesk', 'webdeploy', 'production', 'Fusion360.exe')] : [],
    install: { winget: 'Autodesk.Fusion360' },
    projectArg: 'file',
  },
  {
    id: 'solidworks',
    name: 'SolidWorks',
    kind: '3d',
    exe: 'SLDWORKS.exe',
    hint: 'Dassault Systèmes SolidWorks',
    paths: [],
    scans: [{ root: path.join(programFiles, 'SOLIDWORKS Corp'), pattern: /^SOLIDWORKS/, sub: ['SLDWORKS.exe'] }],
    appPath: 'SLDWORKS.exe',
    install: { winget: 'DassaultSystemes.SolidWorks' },
    projectArg: 'file',
  },
  {
    id: 'revit',
    name: 'Revit',
    kind: '3d',
    exe: 'Revit.exe',
    hint: 'Autodesk Revit',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Autodesk'), pattern: /^Revit \d{4}/, sub: ['Revit.exe'] }],
    install: { winget: 'Autodesk.Revit' },
    projectArg: 'file',
  },
  {
    id: 'coreldraw',
    name: 'CorelDRAW',
    kind: 'design',
    exe: 'CorelDRW.exe',
    hint: 'CorelDRAW Graphics Suite',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Corel'), pattern: /^CorelDRAW/, sub: ['Programs64', 'CorelDRW.exe'] }],
    appPath: 'CorelDRW.exe',
    install: { winget: 'Corel.CorelDRAW' },
    projectArg: 'file',
  },
  {
    id: 'affinity-photo',
    name: 'Affinity Photo',
    kind: 'design',
    exe: 'Photo.exe',
    hint: 'Serif Affinity Photo',
    paths: [],
    scans: [{ root: path.join(programFiles, 'Affinity'), pattern: /^Affinity Photo/, sub: ['Photo.exe'] }],
    install: { winget: 'Affinity.Photo' },
    projectArg: 'file',
  },
  {
    id: 'aseprite',
    name: 'Aseprite',
    kind: 'design',
    exe: 'aseprite.exe',
    hint: '像素画编辑器',
    paths: [],
    appPath: 'aseprite.exe',
    install: { winget: 'Aseprite.Aseprite' },
    projectArg: 'file',
  },
  {
    id: 'notepadpp',
    name: 'Notepad++',
    kind: 'dev',
    exe: 'notepad++.exe',
    hint: 'Notepad++ 文本编辑器',
    paths: [path.join(programFiles, 'Notepad++', 'notepad++.exe')],
    appPath: 'notepad++.exe',
    install: { winget: 'Notepad++.Notepad++' },
    projectArg: 'file',
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    kind: 'dev',
    exe: 'sublime_text.exe',
    hint: 'Sublime Text',
    paths: [path.join(programFiles, 'Sublime Text', 'sublime_text.exe')],
    appPath: 'sublime_text.exe',
    install: { winget: 'SublimeHQ.SublimeText.4' },
  },
  {
    id: 'vscodium',
    name: 'VSCodium',
    kind: 'dev',
    exe: 'VSCodium.exe',
    hint: 'VSCodium 开源编辑器',
    paths: localAppData ? [path.join(localAppData, 'Programs', 'VSCodium', 'VSCodium.exe')] : [],
    appPath: 'VSCodium.exe',
    install: { winget: 'VSCodium.VSCodium' },
  },
  {
    id: 'goland',
    name: 'GoLand',
    kind: 'dev',
    exe: 'goland64.exe',
    hint: 'JetBrains GoLand',
    paths: [],
    scans: localAppData ? [{ root: path.join(localAppData, 'Programs'), pattern: /^GoLand/, sub: ['bin', 'goland64.exe'] }] : [],
    install: { winget: 'JetBrains.GoLand' },
  },
  {
    id: 'rider',
    name: 'Rider',
    kind: 'dev',
    exe: 'rider64.exe',
    hint: 'JetBrains Rider',
    paths: [],
    scans: localAppData ? [{ root: path.join(localAppData, 'Programs'), pattern: /^Rider/, sub: ['bin', 'rider64.exe'] }] : [],
    install: { winget: 'JetBrains.Rider' },
  },
  {
    id: 'clion',
    name: 'CLion',
    kind: 'dev',
    exe: 'clion64.exe',
    hint: 'JetBrains CLion',
    paths: [],
    scans: localAppData ? [{ root: path.join(localAppData, 'Programs'), pattern: /^CLion/, sub: ['bin', 'clion64.exe'] }] : [],
    install: { winget: 'JetBrains.CLion' },
  },
  {
    id: 'datagrip',
    name: 'DataGrip',
    kind: 'dev',
    exe: 'datagrip64.exe',
    hint: 'JetBrains DataGrip',
    paths: [],
    scans: localAppData ? [{ root: path.join(localAppData, 'Programs'), pattern: /^DataGrip/, sub: ['bin', 'datagrip64.exe'] }] : [],
    install: { winget: 'JetBrains.DataGrip' },
  },
  {
    id: 'postman',
    name: 'Postman',
    kind: 'dev',
    exe: 'Postman.exe',
    hint: 'Postman API 调试',
    paths: localAppData ? [path.join(localAppData, 'Postman', 'Postman.exe')] : [],
    appPath: 'Postman.exe',
    install: { winget: 'Postman.Postman' },
  },
  {
    id: 'dbeaver',
    name: 'DBeaver',
    kind: 'dev',
    exe: 'dbeaver.exe',
    hint: 'DBeaver 数据库客户端',
    paths: [path.join(programFiles, 'DBeaver', 'dbeaver.exe')],
    appPath: 'dbeaver.exe',
    install: { winget: 'dbeaver.dbeaver' },
  },
  {
    id: 'docker-desktop',
    name: 'Docker Desktop',
    kind: 'dev',
    exe: 'Docker Desktop.exe',
    hint: 'Docker Desktop',
    paths: [path.join(programFiles, 'Docker', 'Docker', 'Docker Desktop.exe')],
    appPath: 'Docker Desktop.exe',
    install: { winget: 'Docker.DockerDesktop' },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    kind: 'office',
    exe: 'Obsidian.exe',
    hint: 'Obsidian 笔记',
    paths: localAppData ? [path.join(localAppData, 'Obsidian', 'Obsidian.exe')] : [],
    appPath: 'Obsidian.exe',
    install: { winget: 'Obsidian.Obsidian' },
  },
  {
    id: 'typora',
    name: 'Typora',
    kind: 'office',
    exe: 'Typora.exe',
    hint: 'Typora Markdown 编辑器',
    paths: [path.join(programFiles, 'Typora', 'Typora.exe')],
    appPath: 'Typora.exe',
    install: { winget: 'Typora.Typora' },
    projectArg: 'file',
  },
  {
    id: 'libreoffice',
    name: 'LibreOffice',
    kind: 'office',
    exe: 'soffice.exe',
    hint: 'LibreOffice 办公套件',
    paths: [path.join(programFiles, 'LibreOffice', 'program', 'soffice.exe')],
    appPath: 'soffice.exe',
    install: { winget: 'TheDocumentFoundation.LibreOffice' },
    projectArg: 'file',
  },
  {
    id: 'notion',
    name: 'Notion',
    kind: 'office',
    exe: 'Notion.exe',
    hint: 'Notion 桌面端',
    paths: localAppData ? [path.join(localAppData, 'Programs', 'Notion', 'Notion.exe')] : [],
    appPath: 'Notion.exe',
    install: { winget: 'Notion.Notion' },
  },
  {
    id: 'brave',
    name: 'Brave',
    kind: 'browser',
    exe: 'brave.exe',
    hint: 'Brave 浏览器',
    paths: [path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')],
    appPath: 'brave.exe',
    install: { winget: 'Brave.Brave' },
  },
  {
    id: 'opera',
    name: 'Opera',
    kind: 'browser',
    exe: 'opera.exe',
    hint: 'Opera 浏览器',
    paths: localAppData ? [path.join(localAppData, 'Programs', 'Opera', 'opera.exe')] : [],
    appPath: 'opera.exe',
    install: { winget: 'Opera.Opera' },
  },
  {
    id: 'steam',
    name: 'Steam',
    kind: 'system',
    exe: 'steam.exe',
    hint: 'Steam 游戏平台',
    paths: [path.join(programFiles86, 'Steam', 'steam.exe'), path.join(programFiles, 'Steam', 'steam.exe')],
    appPath: 'steam.exe',
    install: { winget: 'Valve.Steam' },
  },
  {
    id: 'power-toys',
    name: 'PowerToys',
    kind: 'system',
    exe: 'PowerToys.exe',
    hint: 'Microsoft PowerToys',
    paths: [],
    appPath: 'PowerToys.exe',
    install: { winget: 'Microsoft.PowerToys' },
  },
  {
    id: 'everything',
    name: 'Everything',
    kind: 'system',
    exe: 'Everything.exe',
    hint: 'voidtools 文件搜索',
    paths: [path.join(programFiles, 'Everything', 'Everything.exe')],
    appPath: 'Everything.exe',
    install: { winget: 'voidtools.Everything' },
  },
  {
    id: 'bandizip',
    name: 'Bandizip',
    kind: 'system',
    exe: 'Bandizip.exe',
    hint: 'Bandizip 压缩工具',
    paths: [path.join(programFiles, 'Bandizip', 'Bandizip.exe')],
    appPath: 'Bandizip.exe',
    install: { winget: 'Bandisoft.Bandizip' },
  },
  {
    id: 'winrar',
    name: 'WinRAR',
    kind: 'system',
    exe: 'WinRAR.exe',
    hint: 'WinRAR 压缩工具',
    paths: [path.join(programFiles, 'WinRAR', 'WinRAR.exe')],
    appPath: 'WinRAR.exe',
    install: { winget: 'RARLab.WinRAR' },
  },
];

function scanPath(search: { root: string; pattern: RegExp; sub: string[] }): string | undefined {
  try {
    if (!existsSync(search.root)) return undefined;
    const dirs = readdirSync(search.root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && search.pattern.test(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const dir of dirs) {
      const candidate = path.join(search.root, dir, ...search.sub);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // 目录不可读时按未安装处理
  }
  return undefined;
}

function registryAppPath(exe: string): string | undefined {
  if (process.platform !== 'win32' || !exe) return undefined;
  for (const hive of ['HKLM', 'HKCU']) {
    try {
      const key = `${hive}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exe}`;
      const result = spawnSync('reg', ['query', key, '/ve'], { encoding: 'utf8', timeout: 4000, windowsHide: true });
      if (result.status !== 0 || !result.stdout) continue;
      const match = /REG_SZ\s+(.+?)\s*$/m.exec(result.stdout);
      if (!match) continue;
      const candidate = match[1].replace(/"$/, '').replace(/^"/, '').trim();
      if (existsSync(candidate)) return candidate;
    } catch {
      // 注册表不可读时继续
    }
  }
  return undefined;
}

let cache: { at: number; apps: LocalAppInfo[] } | null = null;

export interface CustomAppInput {
  id?: string;
  name?: unknown;
  kind?: unknown;
  path?: unknown;
  hint?: unknown;
  projectArg?: unknown;
}

interface CustomAppRecord {
  id: string;
  name: string;
  kind: AppKind;
  path: string;
  hint: string;
  projectArg?: 'projectPath' | 'file';
}

const CUSTOM_APP_LIMIT = 50;
let customApps: CustomAppRecord[] = [];
let customAppStorePath: string | null = null;

function persistCustomApps(): void {
  if (!customAppStorePath) return;
  try {
    mkdirSync(path.dirname(customAppStorePath), { recursive: true });
    writeFileSync(customAppStorePath, JSON.stringify(customApps, null, 2), 'utf8');
  } catch {
    // 写入失败时保留内存态，避免打断当前操作
  }
}

function customDefinitions(): AppDefinition[] {
  return customApps.map((app) => ({
    id: app.id,
    name: app.name,
    kind: app.kind,
    exe: path.basename(app.path),
    hint: app.hint,
    paths: [app.path],
    projectArg: app.projectArg,
  }));
}

export function configureCustomApps(storePath: string): void {
  customAppStorePath = storePath;
  customApps = [];
  try {
    if (!existsSync(storePath)) return;
    const parsed: unknown = JSON.parse(readFileSync(storePath, 'utf8'));
    if (!Array.isArray(parsed)) return;
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const kind = typeof record.kind === 'string' && (APP_KINDS as string[]).includes(record.kind)
        ? (record.kind as AppKind)
        : null;
      const exePath = typeof record.path === 'string' ? record.path.trim() : '';
      if (!name || !kind || !exePath) continue;
      customApps.push({
        id: typeof record.id === 'string' && record.id.startsWith('custom-app-')
          ? record.id
          : `custom-app-${customApps.length + 1}`,
        name: name.slice(0, 60),
        kind,
        path: path.resolve(exePath),
        hint: typeof record.hint === 'string' ? record.hint.trim().slice(0, 80) : '',
        projectArg: record.projectArg === 'projectPath' ? 'projectPath' : 'file',
      });
    }
  } catch {
    // 配置损坏时按无自定义应用处理
  }
  cache = null;
}

export function saveCustomApp(input: unknown): { ok: boolean; app?: LocalAppInfo; error?: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: t('参数无效') };
  const value = input as CustomAppInput;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return { ok: false, error: t('请填写应用名称') };
  if (name.length > 60) return { ok: false, error: t('应用名称过长') };
  const kind = typeof value.kind === 'string' && (APP_KINDS as string[]).includes(value.kind)
    ? (value.kind as AppKind)
    : null;
  if (!kind) return { ok: false, error: t('请选择应用分类') };
  const exePath = typeof value.path === 'string' ? value.path.trim() : '';
  if (!exePath) return { ok: false, error: t('请选择可执行文件') };
  const resolved = path.resolve(exePath);
  if (!existsSync(resolved)) {
    return { ok: false, error: t('可执行文件不存在') };
  }
  if (process.platform === 'win32' && path.extname(resolved).toLowerCase() !== '.exe') {
    return { ok: false, error: t('请选择 .exe 可执行文件') };
  }
  const hint = typeof value.hint === 'string' ? value.hint.trim().slice(0, 80) : '';
  const projectArg = value.projectArg === 'projectPath' ? 'projectPath' : 'file';
  const editId = typeof value.id === 'string' && value.id.startsWith('custom-app-') ? value.id : '';
  const existing = editId ? customApps.find((app) => app.id === editId) : undefined;
  if (!existing && customApps.length >= CUSTOM_APP_LIMIT) {
    return { ok: false, error: t('自定义应用已达上限（{n} 个）', { n: CUSTOM_APP_LIMIT }) };
  }
  const conflicting = [...APPS, ...customDefinitions()].find(
    (item) => item.id !== (existing?.id ?? '') && item.paths.some((candidate) => path.resolve(candidate) === resolved),
  );
  if (conflicting) {
    return { ok: false, error: t('该程序已在内置列表中') };
  }
  if (existing) {
    existing.name = name;
    existing.kind = kind;
    existing.path = resolved;
    existing.hint = hint;
    existing.projectArg = projectArg;
  } else {
    customApps.push({
      id: `custom-app-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      kind,
      path: resolved,
      hint,
      projectArg,
    });
  }
  persistCustomApps();
  cache = null;
  const stored = existing ?? customApps[customApps.length - 1];
  if (!stored) return { ok: false, error: t('保存失败') };
  return {
    ok: true,
    app: {
      id: stored.id,
      name: stored.name,
      kind: stored.kind,
      installed: true,
      path: stored.path,
      hint: stored.hint,
      custom: true,
    },
  };
}

export function removeCustomApp(id: unknown): { ok: boolean; error?: string } {
  if (typeof id !== 'string' || !id.startsWith('custom-app-')) {
    return { ok: false, error: t('参数无效') };
  }
  const index = customApps.findIndex((app) => app.id === id);
  if (index < 0) return { ok: false, error: t('未找到该应用') };
  customApps.splice(index, 1);
  persistCustomApps();
  cache = null;
  return { ok: true };
}

export function detectLocalApps(refresh = false): LocalAppInfo[] {
  if (!refresh && cache && Date.now() - cache.at < 60_000) return cache.apps;
  const apps = [...APPS, ...customDefinitions()].map((definition) => {
    let found: string | undefined;
    for (const candidate of definition.paths) {
      if (existsSync(candidate)) {
        found = candidate;
        break;
      }
    }
    if (!found) {
      for (const search of definition.scans ?? []) {
        found = scanPath(search);
        if (found) break;
      }
    }
    if (!found && definition.appPath) found = registryAppPath(definition.appPath);
    return {
      id: definition.id,
      name: definition.name,
      kind: definition.kind,
      installed: Boolean(found),
      path: found,
      hint: definition.hint,
      custom: definition.id.startsWith('custom-app-') || undefined,
      installId: definition.install?.winget,
    };
  });
  cache = { at: Date.now(), apps };
  return apps;
}

export function launchLocalApp(id: string, target?: string): { ok: boolean; error?: string } {
  const definition = [...APPS, ...customDefinitions()].find((item) => item.id === id);
  if (!definition) return { ok: false, error: t('未知应用') };
  const installed = detectLocalApps().find((item) => item.id === id);
  if (!installed?.installed || !installed.path) {
    return { ok: false, error: t('未检测到 {name}，请先安装', { name: definition.name }) };
  }
  const useTarget = target && existsSync(target) ? path.resolve(target) : undefined;
  const args: string[] = [];
  if (useTarget) {
    if (definition.projectArg === 'projectPath' && !path.extname(useTarget)) {
      args.push('-projectPath', useTarget);
    } else {
      args.push(useTarget);
    }
  }
  const child = spawn(installed.path, args, {
    cwd: useTarget && !path.extname(useTarget) ? useTarget : path.dirname(installed.path),
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.on('error', () => undefined);
  child.unref();
  return { ok: true };
}

export function appCatalog(refresh = false): LocalAppInfo[] {
  return detectLocalApps(refresh);
}

/** 开始菜单扫描缓存：扫描一次约几百毫秒，避免每次切页都重启 PowerShell。 */
let scanCache: { at: number; apps: LocalAppInfo[] } | null = null;

/** 按名称关键词归类；未命中时归到「系统」。 */
const KIND_HINTS: Array<[AppKind, RegExp]> = [
  ['video', /(premiere|after effects|davinci|resolve|obs|capcut|剪映|vegas|hitfilm|filmora|kdenlive|shotcut|handbrake|vlc|potplayer|格式工厂|万兴喵影)/i],
  ['3d', /(blender|maya|3ds max|cinema 4d|c4d|zbrush|rhino|sketchup|solidworks|fusion 360|autocad|revit|houdini|substance|freecad|wings|solid edge|inventor)/i],
  ['design', /(photoshop|illustrator|figma|gimp|inkscape|krita|coreldraw|affinity|canva|aseprite|paint|sketch|procreate)/i],
  ['audio', /(audition|audacity|reaper|fl studio|ableton|studio one|cubase|nuendo|bitwig|foobar|musicbee|音频|录音)/i],
  ['engine', /(unity|unreal|godot|gamemaker|rpg maker|construct)/i],
  ['dev', /(visual studio|vs code|vscode|cursor|windsurf|trae|intellij|pycharm|webstorm|goland|rider|clion|datagrip|sublime|notepad\+\+|postman|dbeaver|docker|git|github|obsidian|typora|neovim|vim|emacs|android studio|qt|dev-c\+\+)/i],
  ['office', /(word|excel|powerpoint|wps|office|libreoffice|notion|onenote|acrobat|foxit|pdf|钉钉|飞书|企业微信|石墨)/i],
  ['browser', /(chrome|edge|firefox|brave|opera|vivaldi|360|qq浏览器|搜狗|browser)/i],
];

function classifyApp(name: string): AppKind {
  for (const [kind, pattern] of KIND_HINTS) {
    if (pattern.test(name)) return kind;
  }
  return 'system';
}

/** 过滤卸载器、更新器、说明文档等非启动项。 */
const SKIP_APP_NAME = /(uninstall|卸载|update|更新|readme|help|帮助|website|官网|license|许可)/i;

function runPowerShell(script: string, timeoutMs: number): Promise<{ ok: boolean; stdout: string; error?: string }> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout) => {
        resolve({
          ok: !error,
          stdout: String(stdout ?? ''),
          error: error ? error.message : undefined,
        });
      },
    );
  });
}

const START_MENU_SCRIPT = [
  "$ErrorActionPreference='SilentlyContinue'",
  '$shell = New-Object -ComObject WScript.Shell',
  '$roots = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs", "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs")',
  '$seen = @{}',
  '$items = @()',
  'foreach ($root in $roots) {',
  '  Get-ChildItem -LiteralPath $root -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {',
  '    $target = $shell.CreateShortcut($_.FullName).TargetPath',
  '    if ($target -and $target.ToLower().EndsWith(".exe") -and (Test-Path -LiteralPath $target)) {',
  '      $key = $target.ToLower()',
  '      if (-not $seen.ContainsKey($key)) {',
  '        $seen[$key] = $true',
  '        $items += [pscustomobject]@{ name = $_.BaseName; path = $target }',
  '      }',
  '    }',
  '  }',
  '}',
  '$items | ConvertTo-Json -Compress -Depth 3',
].join('\n');

/**
 * 扫描开始菜单里的全部快捷方式，返回内置目录之外的本机软件。
 * 只读：解析 .lnk 目标路径，不启动、不修改任何程序。
 */
export async function scanLocalApps(refresh = false): Promise<LocalAppInfo[]> {
  if (!refresh && scanCache && Date.now() - scanCache.at < 5 * 60_000) return scanCache.apps;
  if (process.platform !== 'win32') return [];

  const result = await runPowerShell(START_MENU_SCRIPT, 20_000);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(result.stdout.trim() || 'null');
  } catch {
    parsed = null;
  }
  const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const known = new Set(
    [...APPS, ...customDefinitions()]
      .flatMap((item) => item.paths)
      .map((candidate) => path.resolve(candidate).toLowerCase()),
  );
  const seen = new Set<string>();
  const apps: LocalAppInfo[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const exePath = typeof record.path === 'string' ? record.path.trim() : '';
    if (!name || !exePath || !existsSync(exePath)) continue;
    if (SKIP_APP_NAME.test(name)) continue;
    const resolved = path.resolve(exePath);
    const key = resolved.toLowerCase();
    if (seen.has(key) || known.has(key)) continue;
    seen.add(key);
    apps.push({
      id: `scan-${createHash('sha1').update(key).digest('hex').slice(0, 10)}`,
      name: name.slice(0, 60),
      kind: classifyApp(name),
      installed: true,
      path: resolved,
      hint: t('开始菜单扫描'),
      discovered: true,
    });
  }
  apps.sort((left, right) => left.name.localeCompare(right.name));
  scanCache = { at: Date.now(), apps };
  return apps;
}

/**
 * 用 winget 安装内置应用。
 * 只接受内置目录里的 ID，命令参数固定，不接受用户拼接。
 */
export function installLocalApp(id: string): Promise<{ ok: boolean; output: string; error?: string }> {
  const definition = APPS.find((item) => item.id === id);
  if (!definition?.install) {
    return Promise.resolve({ ok: false, output: '', error: t('该应用没有内置安装源') });
  }
  const args = [
    'install',
    '--id', definition.install.winget,
    '-e',
    '--accept-package-agreements',
    '--accept-source-agreements',
    '--disable-interactivity',
  ];
  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    const finish = (result: { ok: boolean; output: string; error?: string }): void => {
      if (settled) return;
      settled = true;
      cache = null;
      scanCache = null;
      resolve({ ...result, output: output.slice(-8000) });
    };
    let child;
    try {
      child = spawn('winget', args, { windowsHide: true, env: process.env });
    } catch (error) {
      finish({ ok: false, output: '', error: error instanceof Error ? error.message : String(error) });
      return;
    }
    child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.on('error', (error) => {
      finish({
        ok: false,
        output,
        error: /ENOENT/i.test(error.message) ? t('未找到 winget，请先安装「应用安装程序」') : error.message,
      });
    });
    child.on('close', (code) => {
      finish({
        ok: code === 0,
        output,
        error: code === 0 ? undefined : t('安装失败，退出码 {code}', { code: String(code ?? '?') }),
      });
    });
    setTimeout(() => {
      if (settled) return;
      try { child.kill(); } catch { /* 进程可能已退出 */ }
      finish({ ok: false, output, error: t('安装超时，请稍后重试') });
    }, 10 * 60_000).unref();
  });
}

/** 按扫描得到的 ID 启动本机程序；只允许扫描缓存里的路径。 */
export function launchScannedApp(id: string, target?: string): { ok: boolean; error?: string } | null {
  const app = scanCache?.apps.find((item) => item.id === id);
  if (!app?.path) return null;
  if (!existsSync(app.path)) return { ok: false, error: t('程序不存在，请重新扫描') };
  const useTarget = target && existsSync(target) ? path.resolve(target) : undefined;
  const child = spawn(app.path, useTarget ? [useTarget] : [], {
    cwd: useTarget ? path.dirname(useTarget) : path.dirname(app.path),
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.on('error', () => undefined);
  child.unref();
  return { ok: true };
}
