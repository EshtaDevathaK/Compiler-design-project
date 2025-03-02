import { Lexer, LexicalError, Token } from './Lexer';
import { Parser, SyntaxError, ASTNode } from './Parser';
import { SemanticAnalyzer, SemanticError } from './SemanticAnalyzer';
import { IRGenerator, IRInstruction, IRGenerationError } from './IRGenerator';
import { Optimizer } from './Optimizer';
import { CodeGenerator, CodeGenerationError } from './CodeGenerator';

export interface CompilationResult {
  success: boolean;
  tokens?: Token[];
  ast?: ASTNode;
  ir?: IRInstruction[];
  optimizedIr?: IRInstruction[];
  code?: string;
  errors: {
    phase: string;
    message: string;
    line?: number;
    column?: number;
  }[];
}

export class Compiler {
  private lexer: Lexer;
  private parser: Parser;
  private semanticAnalyzer: SemanticAnalyzer;
  private irGenerator: IRGenerator;
  private optimizer: Optimizer;
  private codeGenerator: CodeGenerator;

  constructor() {
    this.lexer = new Lexer("");
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.irGenerator = new IRGenerator();
    this.optimizer = new Optimizer();
    this.codeGenerator = new CodeGenerator();
    this.parser = new Parser([]);
  }

  compile(source: string): CompilationResult {
    const result: CompilationResult = {
      success: true,
      errors: []
    };

    try {
      // Lexical Analysis
      this.lexer = new Lexer(source);
      const tokens = this.lexer.tokenize();
      result.tokens = tokens;

      // Syntax Analysis
      this.parser = new Parser(tokens);
      const ast = this.parser.parse();
      result.ast = ast;

      // Semantic Analysis
      const semanticErrors = this.semanticAnalyzer.analyze(ast);
      if (semanticErrors.length > 0) {
        result.success = false;
        for (const error of semanticErrors) {
          result.errors.push({
            phase: "Semantic Analysis",
            message: error.message
          });
        }
        return result;
      }

      // Intermediate Code Generation
      const ir = this.irGenerator.generate(ast);
      result.ir = ir;

      // Optimization
      const optimizedIr = this.optimizer.optimize(ir);
      result.optimizedIr = optimizedIr;

      // Code Generation
      const code = this.codeGenerator.generate(optimizedIr);
      result.code = code;

    } catch (error) {
      result.success = false;

      if (error instanceof LexicalError) {
        result.errors.push({
          phase: "Lexical Analysis",
          message: error.message,
          line: error.line,
          column: error.column
        });
      } else if (error instanceof SyntaxError) {
        result.errors.push({
          phase: "Syntax Analysis",
          message: error.message,
          line: error.token.line,
          column: error.token.column
        });
      } else if (error instanceof SemanticError) {
        result.errors.push({
          phase: "Semantic Analysis",
          message: error.message
        });
      } else if (error instanceof IRGenerationError) {
        result.errors.push({
          phase: "IR Generation",
          message: error.message
        });
      } else if (error instanceof CodeGenerationError) {
        result.errors.push({
          phase: "Code Generation",
          message: error.message
        });
      } else {
        result.errors.push({
          phase: "Unknown",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }
}