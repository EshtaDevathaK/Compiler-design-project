import './style.css';
import { Compiler } from './compiler/Compiler';

// Sample program to test
const sampleCode = `function computeFactorial(n) {
  if (n <= 1) return 1;
  return n * computeFactorial(n - 1);
}

function executeMain() {
  return computeFactorial(5);
}
`;

// Ensure the document is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  const appDiv = document.querySelector<HTMLDivElement>('#app');
  
  if (!appDiv) {
    console.error('Error: #app container not found!');
    return;
  }

  // Set up UI structure
  appDiv.innerHTML = `
    <div class="compiler-container">
      <h1>Compiler Design Project</h1>
      
      <div class="phases">
        <div class="phase-nav">
          <button class="phase-btn active" data-phase="source">Source Code</button>
          <button class="phase-btn" data-phase="lexical">Lexical Analysis</button>
          <button class="phase-btn" data-phase="syntax">Syntax Analysis</button>
          <button class="phase-btn" data-phase="semantic">Semantic Analysis</button>
          <button class="phase-btn" data-phase="ir">IR Generation</button>
          <button class="phase-btn" data-phase="optimization">Optimization</button>
          <button class="phase-btn" data-phase="codegen">Code Generation</button>
        </div>

        <div class="phase-content">
          <div class="phase-panel active" id="source-panel">
            <h2>Source Code</h2>
            <textarea id="source-code" spellcheck="false">${sampleCode}</textarea>
            <button id="compile-btn">Compile</button>
          </div>

          <div class="phase-panel" id="lexical-panel"><h2>Lexical Analysis</h2><pre id="lexical-output"></pre></div>
          <div class="phase-panel" id="syntax-panel"><h2>Syntax Analysis</h2><pre id="syntax-output"></pre></div>
          <div class="phase-panel" id="semantic-panel"><h2>Semantic Analysis</h2><pre id="semantic-output"></pre></div>
          <div class="phase-panel" id="ir-panel"><h2>Intermediate Representation</h2><pre id="ir-output"></pre></div>
          <div class="phase-panel" id="optimization-panel"><h2>Optimized IR</h2><pre id="optimization-output"></pre></div>
          <div class="phase-panel" id="codegen-panel"><h2>Generated Code</h2><pre id="codegen-output"></pre></div>
        </div>
      </div>

      <div class="error-container"><h2>Compilation Errors</h2><pre id="error-output"></pre></div>
    </div>
  `;

  // UI References
  const sourceCode = document.getElementById('source-code') as HTMLTextAreaElement;
  const compileBtn = document.getElementById('compile-btn') as HTMLButtonElement;
  const errorOutput = document.getElementById('error-output') as HTMLPreElement;

  const lexicalOutput = document.getElementById('lexical-output') as HTMLPreElement;
  const syntaxOutput = document.getElementById('syntax-output') as HTMLPreElement;
  const semanticOutput = document.getElementById('semantic-output') as HTMLPreElement;
  const irOutput = document.getElementById('ir-output') as HTMLPreElement;
  const optimizationOutput = document.getElementById('optimization-output') as HTMLPreElement;
  const codegenOutput = document.getElementById('codegen-output') as HTMLPreElement;

  const phaseBtns = document.querySelectorAll('.phase-btn');
  const phasePanels = document.querySelectorAll('.phase-panel');

  // Phase Switching
  phaseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = (btn as HTMLElement).dataset.phase;

      // Update active button
      phaseBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active panel
      phasePanels.forEach(panel => panel.classList.remove('active'));
      document.getElementById(`${phase}-panel`)?.classList.add('active');
    });
  });

  // Compilation Handler
  compileBtn.addEventListener('click', () => {
    const source = sourceCode.value.trim();
    const compiler = new Compiler();
    const result = compiler.compile(source);

    // Reset outputs
    errorOutput.textContent = '';
    lexicalOutput.textContent = '';
    syntaxOutput.textContent = '';
    semanticOutput.textContent = 'No semantic errors.';
    irOutput.textContent = '';
    optimizationOutput.textContent = '';
    codegenOutput.textContent = '';

    if (!result.success) {
      errorOutput.textContent = result.errors
        .map(err => `[${err.phase}] ${err.message} at line ${err.line}, column ${err.column}`)
        .join('\n');
    } else {
      errorOutput.textContent = 'Compilation successful!';
    }

    if (result.tokens) lexicalOutput.textContent = JSON.stringify(result.tokens, null, 2);
    if (result.ast) syntaxOutput.textContent = JSON.stringify(result.ast, null, 2);
    if (result.ir) irOutput.textContent = JSON.stringify(result.ir, null, 2);
    if (result.optimizedIr) optimizationOutput.textContent = JSON.stringify(result.optimizedIr, null, 2);
    if (result.code) codegenOutput.textContent = result.code;
  });

  // Initial compile
  compileBtn.click();
});
