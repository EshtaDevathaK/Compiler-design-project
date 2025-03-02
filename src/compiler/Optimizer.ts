import { IRInstruction } from './IRGenerator';

export class Optimizer {
  optimize(ir: IRInstruction[]): IRInstruction[] {
    let optimized = [...ir];
    
    // Apply optimizations until no more changes
    let changed = true;
    while (changed) {
      changed = false;
      
      // Apply each optimization pass
      const passes = [
        this.constantFolding,
        this.deadCodeElimination,
        this.constantPropagation,
        this.commonSubexpressionElimination
      ];
      
      for (const pass of passes) {
        const result = pass.call(this, optimized);
        if (result.changed) {
          optimized = result.ir;
          changed = true;
        }
      }
    }
    
    return optimized;
  }

  private constantFolding(ir: IRInstruction[]): { ir: IRInstruction[], changed: boolean } {
    const result: IRInstruction[] = [];
    let changed = false;
    
    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];
      
      // Check for constant binary operations
      if (["ADD", "SUB", "MUL", "DIV", "EQ", "NEQ", "LT", "LTE", "GT", "GTE"].includes(instr.op)) {
        const prevInstr1 = this.findPreviousConstInstr(ir, i, instr.args[0]);
        const prevInstr2 = this.findPreviousConstInstr(ir, i, instr.args[1]);
        
        if (prevInstr1 && prevInstr2) {
          const val1 = prevInstr1.args[0];
          const val2 = prevInstr2.args[0];
          
          if (typeof val1 === 'number' && typeof val2 === 'number') {
            let resultVal;
            
            switch (instr.op) {
              case "ADD": resultVal = val1 + val2; break;
              case "SUB": resultVal = val1 - val2; break;
              case "MUL": resultVal = val1 * val2; break;
              case "DIV": resultVal = val1 / val2; break;
              case "EQ": resultVal = val1 === val2; break;
              case "NEQ": resultVal = val1 !== val2; break;
              case "LT": resultVal = val1 < val2; break;
              case "LTE": resultVal = val1 <= val2; break;
              case "GT": resultVal = val1 > val2; break;
              case "GTE": resultVal = val1 >= val2; break;
            }
            
            result.push({ op: "CONST", args: [resultVal, instr.args[2]] });
            changed = true;
            continue;
          }
        }
      }
      
      // Check for constant unary operations
      if (["NEG", "NOT"].includes(instr.op)) {
        const prevInstr = this.findPreviousConstInstr(ir, i, instr.args[0]);
        
        if (prevInstr) {
          const val = prevInstr.args[0];
          
          if (typeof val === 'number' || typeof val === 'boolean') {
            let resultVal;
            
            switch (instr.op) {
              case "NEG": resultVal = -val; break;
              case "NOT": resultVal = !val; break;
            }
            
            result.push({ op: "CONST", args: [resultVal, instr.args[1]] });
            changed = true;
            continue;
          }
        }
      }
      
      result.push(instr);
    }
    
    return { ir: result, changed };
  }

  private deadCodeElimination(ir: IRInstruction[]): { ir: IRInstruction[], changed: boolean } {
    // Find all used variables
    const usedVars = new Set<string>();
    const labels = new Set<string>();
    const jumps = new Map<string, string[]>();
    
    // First pass: collect all labels and jump targets
    for (const instr of ir) {
      if (instr.op === "LABEL") {
        labels.add(instr.args[0]);
      } else if (["JUMP", "JUMP_IF_TRUE", "JUMP_IF_FALSE"].includes(instr.op)) {
        const target = instr.args[instr.op === "JUMP" ? 0 : 1];
        if (!jumps.has(target)) {
          jumps.set(target, []);
        }
      }
    }
    
    // Second pass: mark all used variables
    for (const instr of ir) {
      // Mark variables used in operations
      if (instr.op !== "STORE" && instr.op !== "CONST") {
        for (const arg of instr.args) {
          if (typeof arg === 'string' && arg.startsWith('t')) {
            usedVars.add(arg);
          }
        }
      }
    }
    
    // Remove unused stores and constants
    const result: IRInstruction[] = [];
    let changed = false;
    
    for (const instr of ir) {
      // Skip unused store operations
      if (instr.op === "STORE" || instr.op === "CONST") {
        const target = instr.op === "STORE" ? instr.args[1] : instr.args[1];
        if (typeof target === 'string' && target.startsWith('t') && !usedVars.has(target)) {
          changed = true;
          continue;
        }
      }
      
      // Skip unused labels
      if (instr.op === "LABEL" && !jumps.has(instr.args[0])) {
        changed = true;
        continue;
      }
      
      result.push(instr);
    }
    
    return { ir: result, changed };
  }

  private constantPropagation(ir: IRInstruction[]): { ir: IRInstruction[], changed: boolean } {
    const constants = new Map<string, any>();
    const result: IRInstruction[] = [];
    let changed = false;
    
    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];
      
      // Track constants
      if (instr.op === "CONST") {
        constants.set(instr.args[1], instr.args[0]);
      } else if (instr.op === "STORE") {
        // If we're storing a constant, track the variable
        if (typeof instr.args[0] === 'string' && constants.has(instr.args[0])) {
          constants.set(instr.args[1], constants.get(instr.args[0]));
        } else {
          // Variable is no longer constant
          constants.delete(instr.args[1]);
        }
      } else if (instr.op === "LOAD") {
        // If loading a constant, replace with CONST
        if (constants.has(instr.args[0])) {
          result.push({
            op: "CONST",
            args: [constants.get(instr.args[0]), instr.args[1]]
          });
          changed = true;
          continue;
        }
      } else if (["BLOCK_START", "FUNCTION_START"].includes(instr.op)) {
        // Clear constants when entering a new scope
        constants.clear();
      }
      
      // Replace arguments with constants if possible
      let instrChanged = false;
      const newArgs = instr.args.map(arg => {
        if (typeof arg === 'string' && constants.has(arg)) {
          instrChanged = true;
          return constants.get(arg);
        }
        return arg;
      });
      
      if (instrChanged) {
        result.push({ op: instr.op, args: newArgs });
        changed = true;
      } else {
        result.push(instr);
      }
    }
    
    return { ir: result, changed };
  }

  private commonSubexpressionElimination(ir: IRInstruction[]): { ir: IRInstruction[], changed: boolean } {
    const expressions = new Map<string, string>();
    const result: IRInstruction[] = [];
    let changed = false;
    
    for (let i = 0; i < ir.length; i++) {
      const instr = ir[i];
      
      // Only apply to binary operations
      if (["ADD", "SUB", "MUL", "DIV", "EQ", "NEQ", "LT", "LTE", "GT", "GTE"].includes(instr.op)) {
        const expr = `${instr.op}(${instr.args[0]},${instr.args[1]})`;
        
        if (expressions.has(expr)) {
          // Replace with a copy from the previous result
          result.push({
            op: "COPY",
            args: [expressions.get(expr), instr.args[2]]
          });
          changed = true;
          continue;
        } else {
          // Remember this expression
          expressions.set(expr, instr.args[2]);
        }
      } else if (["STORE", "CALL", "FUNCTION_START", "BLOCK_START"].includes(instr.op)) {
        // Clear expressions on operations that might change values
        expressions.clear();
      }
      
      result.push(instr);
    }
    
    return { ir: result, changed };
  }

  private findPreviousConstInstr(ir: IRInstruction[], currentIndex: number, tempVar: string): IRInstruction | null {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const instr = ir[i];
      if (instr.op === "CONST" && instr.args[1] === tempVar) {
        return instr;
      }
    }
    return null;
  }
}