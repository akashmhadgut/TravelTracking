const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/components/FleetManagementView.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Ensure icons are imported
content = content.replace(
  "import {\n  Bus,\n  User,",
  "import {\n  Car,\n  User,\n  Eye,\n  Upload,\n  Download,\n  Printer,\n  QrCode,"
);

// 2. Ensure Car icon is used instead of Bus
content = content.replace(/<Bus className=/g, '<Car className=');

// 3. Add previewDoc state to FleetManagementView
const stateCode = `
  // Document Viewer Lightbox State
  interface DocPreviewData {
    title: string;
    category: string;
    docNo: string;
    regNoOrPerson: string;
    validUntil: string;
    issuer: string;
    status: string;
    fileUrl?: string;
    details?: Record<string, string>;
  }

  const [previewDoc, setPreviewDoc] = useState<DocPreviewData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; url: string }>>({});

  const handleFileUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedFiles((prev) => ({
        ...prev,
        [docKey]: { name: file.name, url: dataUrl },
      }));
    };
    reader.readAsDataURL(file);
  };
`;

content = content.replace(
  "  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<DriverItem | null>(null);",
  "  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<DriverItem | null>(null);" + stateCode
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Document preview state added to FleetManagementView.tsx');

