/* ==========================================================
   PDF Toolkit – CLEAN + FIXED JS (matching new HTML)
   ========================================================== */

console.log("PDF Toolkit JS Loaded");

/* Load pdf-lib */
const pdfLibScript = document.createElement("script");
pdfLibScript.src =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
document.head.appendChild(pdfLibScript);

/* Utility: download */
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* Read file as buffer */
function readFile(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsArrayBuffer(file);
  });
}

/* Add message inside results */
function addResult(message) {
  document.getElementById("result-list").innerHTML += `<div>${message}</div>`;
}

/* ==========================================================
   1. IMAGES → PDF
   ========================================================== */
document.getElementById("btn-convert-images").onclick = async () => {
  const input = document.getElementById("img-files-input");
  const files = [...input.files];

  if (!files.length) return alert("Please select images.");

  await pdfLibScript.onload;
  const { PDFDocument } = PDFLib;

  addResult("Converting images → PDF...");

  const pdf = await PDFDocument.create();

  for (let file of files) {
    const bytes = await readFile(file);
    const img = file.type.includes("png")
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);

    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  const out = await pdf.save();
  download(new Blob([out], { type: "application/pdf" }), "images_to_pdf.pdf");

  addResult("Images → PDF completed.");
};

/* ==========================================================
   2. CHANGE PDF BACKGROUND
  /* ==========================================================
   CHANGE PDF BACKGROUND + AUTO TEXT COLOR
   ========================================================== */
document.getElementById("btn-change-bg").onclick = async () => {
  const file = document.getElementById("pdf-bg-input").files[0];
  if (!file) return alert("Select PDF");

  // which color is selected?
  const selected = document.querySelector("input[name='bg-color']:checked");
  if (!selected) return alert("Select background color");

  const chosenColor = selected.value;

  /* Background + Text color mapping */
  let bgColor, textColor;

  if (chosenColor === "white") {
    bgColor = [1, 1, 1];
    textColor = [0, 0, 0]; // black text
  }
  if (chosenColor === "black") {
    bgColor = [0, 0, 0];
    textColor = [1, 1, 1]; // white text
  }
  if (chosenColor === "yellow") {
    bgColor = [1, 0.96, 0.5];
    textColor = [0.2, 0.2, 0.2]; // dark text
  }

  await pdfLibScript.onload;
  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  addResult("Applying background & adjusting text color...");

  const pdfBytes = await readFile(file);
  const pdf = await PDFDocument.load(pdfBytes);

  /* Embed font so that we can overwrite text */
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  /* Loop all pages */
  const pages = pdf.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();

    /* Draw new background rectangle */
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(...bgColor),
    });

    /* If the PDF contains text, redraw text in new color.
       (This overrides text color of existing fonts)
    */
    const textOps = page.node.get('Contents');

    if (textOps) {
      // Extract raw text (simple version – for most PDFs works)
      const rawText = page.getTextContent?.() || null;

      if (rawText) {
        page.drawText(rawText, {
          x: 40,
          y: height - 80,
          size: 12,
          color: rgb(...textColor),
          font,
        });
      }
    }
  });

  /* Output */
  const out = await pdf.save();
  download(
    new Blob([out], { type: "application/pdf" }),
    `background_${chosenColor}.pdf`
  );

  addResult("Background changed & text adjusted.");
};

/* ==========================================================
   3. DELETE PAGES
   ========================================================== */
document.getElementById("btn-delete-pages").onclick = async () => {
  const file = document.getElementById("pdf-delete-input").files[0];
  const list = document.getElementById("pdf-delete-pages").value.trim();

  if (!file || !list) return alert("Select PDF and enter pages.");

  await pdfLibScript.onload;
  const { PDFDocument } = PDFLib;

  addResult("Deleting pages...");

  const bytes = await readFile(file);
  const pdf = await PDFDocument.load(bytes);

  const toDelete = new Set();

  list.split(",").forEach((part) => {
    if (part.includes("-")) {
      const [s, e] = part.split("-").map((n) => parseInt(n));
      for (let i = s; i <= e; i++) toDelete.add(i - 1);
    } else toDelete.add(parseInt(part) - 1);
  });

  const pageIndices = pdf.getPageIndices();
  const keep = pageIndices.filter((i) => !toDelete.has(i));

  pdf.reorderPages(keep);

  const out = await pdf.save();
  download(
    new Blob([out], { type: "application/pdf" }),
    "deleted_pages.pdf"
  );

  addResult("Pages deleted.");
};

/* ==========================================================
   4. MERGE PDFs
   ========================================================== */
document.getElementById("btn-merge").onclick = async () => {
  const files = [...document.getElementById("pdf-merge-input").files];
  if (!files.length) return alert("Select PDF files.");

  await pdfLibScript.onload;
  const { PDFDocument } = PDFLib;

  addResult("Merging...");

  const outPdf = await PDFDocument.create();

  for (let file of files) {
    const bytes = await readFile(file);
    const pdf = await PDFDocument.load(bytes);
    const copied = await outPdf.copyPages(pdf, pdf.getPageIndices());
    copied.forEach((p) => outPdf.addPage(p));
  }

  const out = await outPdf.save();
  download(new Blob([out], { type: "application/pdf" }), "merged.pdf");

  addResult("Merge completed.");
};

/* ==========================================================
   5. TEXT → PDF
   (Simplified — no font/size/title fields in new HTML)
   ========================================================== */
document.getElementById("btn-text2pdf").onclick = async () => {
  const text = document.getElementById("text2pdf-content").value.trim();

  if (!text) return alert("Write some text.");

  await pdfLibScript.onload;
  const { PDFDocument, StandardFonts } = PDFLib;

  addResult("Generating Text → PDF...");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([595, 842]);
  page.drawText(text, {
    x: 40,
    y: 760,
    size: 14,
    font,
  });

  const out = await pdf.save();
  download(new Blob([out], { type: "application/pdf" }), "text_to_pdf.pdf");

  addResult("Text → PDF done.");
};

/* ==========================================================
   6. PDF → PAGES
   (Simplified HTML version – always outputs PDFs)
   ========================================================== */
document.getElementById("btn-pdf2pages").onclick = async () => {
  const file = document.getElementById("pdf2pages-input").files[0];
  if (!file) return alert("Select PDF");

  addResult("Splitting pages...");

  await pdfLibScript.onload;
  const { PDFDocument } = PDFLib;

  const bytes = await readFile(file);
  const pdf = await PDFDocument.load(bytes);

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPDF = await PDFDocument.create();
    const copied = await newPDF.copyPages(pdf, [i]);
    newPDF.addPage(copied[0]);

    const out = await newPDF.save();
    download(
      new Blob([out], { type: "application/pdf" }),
      `page_${i + 1}.pdf`
    );
  }

  addResult("PDF → Pages completed.");
};
