const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Remove the local demoModeEnabled state and replace with state.demoMode
code = code.replace(/const \[demoModeEnabled, setDemoModeEnabled\] = useState\(true\);\n?/, '');

// 2. Remove the Demo Mode button from top actions
const topbarRegex = /<button onClick=\{\(\) => setDemoModeEnabled\(\!demoModeEnabled\)\}.*?<\/button>/;
code = code.replace(topbarRegex, '');

// 3. Update the type definition of State to include demoMode
code = code.replace(
  /type State = \{ session: Session; sessions: Session\[\]; messages: Message\[\]; provider: string \};/,
  'type State = { session: Session; sessions: Session[]; messages: Message[]; provider: string; demoMode?: boolean };'
);

// 4. Update the sections logic to filter out Demo/simulated items if demoMode is false
// We have `const sections = [...]` at the top level. We need to move it inside `export default function Home()` or make a function to build sections.
// Wait, actually `sections` is mapped inside the component render. Let's just filter it there.
const sectionMapRegex = /sections\.map\(section =>/g;
code = code.replace(
  sectionMapRegex,
  'sections.map(s => ({...s, items: s.items.filter(i => state?.demoMode || !["Demo catalog", "Work items", "Analysis", "Round table", "Plans", "Knowledge intelligence", "Ingestion", "Development", "Reviews", "Testing", "Failure analysis", "Integrations", "Confluence", "Azure DevOps", "Releases", "Environments", "Workflow controls", "Model routing", "Observability", "Security"].includes(i.label))})).filter(s => s.items.length > 0).map(section =>'
);

// 5. Update the DemoWorkbench check in the main render
code = code.replace(
  /demoModeEnabled \? <DemoWorkbench nav=\{nav\}\/> : /g,
  'state?.demoMode ? <DemoWorkbench nav={nav}/> : '
);

fs.writeFileSync('src/app/page.tsx', code);
