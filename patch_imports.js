const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Restore imports
const missingImports = `import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { CompanySettings } from "@/components/company-settings";
import { CompanySwitcher } from "@/components/company-switcher";
import { ProviderSetup } from "@/components/provider-setup";
import { AppIntegrations } from "@/components/app-integrations";
import { DocumentsLibrary } from "@/components/documents-library";
import { GroupChatDialog } from "@/components/group-chat-dialog";`;

if (!code.includes('AnalyticsDashboard')) {
  code = code.replace(
    'import { DemoWorkbench } from "@/components/demo-workbench";',
    'import { DemoWorkbench } from "@/components/demo-workbench";\n' + missingImports
  );
}

// 2. Restore the `<ProviderSetup/><AppIntegrations/>`
// Wait, where was it?
// In the current page.tsx, where is Settings rendered? Let's check!
fs.writeFileSync('src/app/page.tsx', code);
