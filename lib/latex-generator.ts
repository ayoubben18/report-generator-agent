interface LaTeXOptions {
    documentClass?: string;
    packages?: string[];
    title?: string;
    author?: string;
    date?: string;
    geometry?: string;
    fontSize?: string;
    includeTableOfContents?: boolean;
    bibliography?: boolean;
  }
  
  export class LaTeXService {
    private options: LaTeXOptions;
  
    constructor(options: LaTeXOptions = {}) {
      this.options = {
        documentClass: 'article',
        packages: [
          'inputenc',
          'fontenc',
          'geometry',
          'amsmath',
          'amsfonts',
          'amssymb',
          'graphicx',
          'hyperref',
          'cite',
          'enumitem',
          'fancyhdr',
          'setspace'
        ],
        geometry: 'margin=1in',
        fontSize: '12pt',
        includeTableOfContents: false,
        bibliography: false,
        ...options
      };
    }
  
    /**
     * Convert markdown text to compilable LaTeX
     */
    public convertToLaTeX(markdown: string): string {
      let latex = this.generatePreamble();
      latex += '\\begin{document}\n\n';
      
      if (this.options.title || this.options.author) {
        latex += this.generateTitlePage();
      }
      
      if (this.options.includeTableOfContents) {
        latex += '\\tableofcontents\n\\newpage\n\n';
      }
      
      latex += this.convertContent(markdown);
      
      if (this.options.bibliography) {
        latex += '\n\\bibliography{references}\n\\bibliographystyle{plain}\n';
      }
      
      latex += '\n\\end{document}';
      
      return latex;
    }
  
    private generatePreamble(): string {
      let preamble = `\\documentclass[${this.options.fontSize}]{${this.options.documentClass}}\n\n`;
      
      // Add packages
      this.options.packages?.forEach(pkg => {
        if (pkg === 'inputenc') {
          preamble += '\\usepackage[utf8]{inputenc}\n';
        } else if (pkg === 'fontenc') {
          preamble += '\\usepackage[T1]{fontenc}\n';
        } else if (pkg === 'geometry') {
          preamble += `\\usepackage[${this.options.geometry}]{geometry}\n`;
        } else if (pkg === 'hyperref') {
          preamble += '\\usepackage[colorlinks=true,linkcolor=blue,citecolor=blue,urlcolor=blue]{hyperref}\n';
        } else {
          preamble += `\\usepackage{${pkg}}\n`;
        }
      });
      
      preamble += '\n';
      
      // Set title, author, date if provided
      if (this.options.title) {
        preamble += `\\title{${this.escapeLatex(this.options.title)}}\n`;
      }
      if (this.options.author) {
        preamble += `\\author{${this.escapeLatex(this.options.author)}}\n`;
      }
      if (this.options.date) {
        preamble += `\\date{${this.escapeLatex(this.options.date)}}\n`;
      } else if (this.options.title || this.options.author) {
        preamble += '\\date{\\today}\n';
      }
      
      preamble += '\n';
      
      return preamble;
    }
  
    private generateTitlePage(): string {
      return '\\maketitle\n\\newpage\n\n';
    }
  
    private convertContent(markdown: string): string {
      let content = markdown;
      
      // Process in order of complexity to avoid conflicts
      content = this.convertHeaders(content);
      content = this.convertCodeBlocks(content);
      content = this.convertMathBlocks(content);
      content = this.convertInlineMath(content);
      content = this.convertLists(content);
      content = this.convertBlockquotes(content);
      content = this.convertLinks(content);
      content = this.convertImages(content);
      content = this.convertTextFormatting(content);
      content = this.convertHorizontalRules(content);
      content = this.cleanupWhitespace(content);
      content = this.escapeSpecialCharacters(content);
      
      return content;
    }
  
    private convertHeaders(content: string): string {
      // Convert headers (# ## ### etc.)
      return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
        const level = hashes.length;
        const cleanTitle = this.escapeLatex(title.trim());
        
        switch (level) {
          case 1: return `\\section{${cleanTitle}}`;
          case 2: return `\\subsection{${cleanTitle}}`;
          case 3: return `\\subsubsection{${cleanTitle}}`;
          case 4: return `\\paragraph{${cleanTitle}}`;
          case 5: return `\\subparagraph{${cleanTitle}}`;
          case 6: return `\\textbf{${cleanTitle}}`;
          default: return `\\section{${cleanTitle}}`;
        }
      });
    }
  
    private convertCodeBlocks(content: string): string {
      // Convert fenced code blocks
      return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        const cleanCode = code.trim();
        return `\\begin{verbatim}\n${cleanCode}\n\\end{verbatim}`;
      });
    }
  
    private convertMathBlocks(content: string): string {
      // Convert display math blocks $$...$$ 
      return content.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (match, math) => {
        return `\\[\n${math.trim()}\n\\]`;
      });
    }
  
    private convertInlineMath(content: string): string {
      // Convert inline math $...$
      return content.replace(/\$([^$\n]+)\$/g, (match, math) => {
        return `$${math}$`;
      });
    }
  
    private convertLists(content: string): string {
      // Convert unordered lists
      content = content.replace(/^(\s*)\*\s+(.+)$/gm, (match, indent, item) => {
        const level = Math.floor(indent.length / 2);
        return `${indent}\\item ${item}`;
      });
      
      content = content.replace(/^(\s*)-\s+(.+)$/gm, (match, indent, item) => {
        const level = Math.floor(indent.length / 2);
        return `${indent}\\item ${item}`;
      });
      
      // Convert ordered lists
      content = content.replace(/^(\s*)\d+\.\s+(.+)$/gm, (match, indent, item) => {
        return `${indent}\\item ${item}`;
      });
      
      // Wrap consecutive list items in itemize/enumerate environments
      content = this.wrapListItems(content);
      
      return content;
    }
  
    private wrapListItems(content: string): string {
      const lines = content.split('\n');
      const result: string[] = [];
      let inList = false;
      let listType: 'itemize' | 'enumerate' | null = null;
      let currentIndent = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const itemMatch = line.match(/^(\s*)\\item\s+(.+)$/);
        
        if (itemMatch) {
          const indent = itemMatch[1].length;
          
          if (!inList) {
            // Starting a new list
            listType = 'itemize'; // Default to itemize
            result.push(`${' '.repeat(indent)}\\begin{${listType}}`);
            inList = true;
            currentIndent = indent;
          }
          
          result.push(line);
        } else {
          if (inList && line.trim() === '') {
            // Empty line in list - keep it
            result.push(line);
          } else if (inList) {
            // End of list
            result.push(`${' '.repeat(currentIndent)}\\end{${listType}}`);
            inList = false;
            listType = null;
            result.push(line);
          } else {
            result.push(line);
          }
        }
      }
      
      // Close any remaining open list
      if (inList && listType) {
        result.push(`${' '.repeat(currentIndent)}\\end{${listType}}`);
      }
      
      return result.join('\n');
    }
  
    private convertBlockquotes(content: string): string {
      // Convert blockquotes
      return content.replace(/^>\s+(.+)$/gm, (match, quote) => {
        return `\\begin{quote}\n${quote}\n\\end{quote}`;
      });
    }
  
    private convertLinks(content: string): string {
      // Convert links [text](url)
      return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `\\href{${url}}{${this.escapeLatex(text)}}`;
      });
    }
  
    private convertImages(content: string): string {
      // Convert images ![alt](src)
      return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        const caption = alt ? `\\caption{${this.escapeLatex(alt)}}` : '';
        return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${src}}\n${caption}\n\\end{figure}`;
      });
    }
  
    private convertTextFormatting(content: string): string {
      // Convert bold **text** or __text__
      content = content.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
      content = content.replace(/__([^_]+)__/g, '\\textbf{$1}');
      
      // Convert italic *text* or _text_
      content = content.replace(/\*([^*]+)\*/g, '\\textit{$1}');
      content = content.replace(/_([^_]+)_/g, '\\textit{$1}');
      
      // Convert inline code `text`
      content = content.replace(/`([^`]+)`/g, '\\texttt{$1}');
      
      return content;
    }
  
    private convertHorizontalRules(content: string): string {
      // Convert horizontal rules
      return content.replace(/^---+$/gm, '\\noindent\\rule{\\textwidth}{0.4pt}');
    }
  
    private cleanupWhitespace(content: string): string {
      // Remove excessive whitespace and ensure proper paragraph breaks
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      return content;
    }
  
    private escapeSpecialCharacters(content: string): string {
      // Escape special LaTeX characters (but preserve our LaTeX commands)
      const specialChars: { [key: string]: string } = {
        '&': '\\&',
        '%': '\\%',
        '$': '\\$', // Be careful with math mode
        '#': '\\#',
        '^': '\\textasciicircum{}',
        '_': '\\_',
        '{': '\\{',
        '}': '\\}',
        '~': '\\textasciitilde{}',
        '\\': '\\textbackslash{}'
      };
      
      // Don't escape characters that are part of LaTeX commands we've already added
      let result = content;
      
      // Only escape these characters when they're not part of LaTeX commands
      for (const [char, replacement] of Object.entries(specialChars)) {
        if (char === '$') {
          // Don't escape $ in math mode
          continue;
        }
        if (char === '\\') {
          // Don't escape backslashes that start LaTeX commands
          result = result.replace(/\\(?![a-zA-Z])/g, replacement);
        } else {
          // Simple character replacement, but avoid replacing in LaTeX commands
          const regex = new RegExp(`(?<!\\\\[a-zA-Z]*?)\\${char}`, 'g');
          result = result.replace(regex, replacement);
        }
      }
      
      return result;
    }
  
    private escapeLatex(text: string): string {
      return text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}');
    }
  
    /**
     * Utility method to set document options
     */
    public setOptions(options: Partial<LaTeXOptions>): void {
      this.options = { ...this.options, ...options };
    }
  
    /**
     * Generate a complete LaTeX document with custom options
     */
    public static generateDocument(
      markdown: string, 
      options: LaTeXOptions = {}
    ): string {
      const service = new LaTeXService(options);
      return service.convertToLaTeX(markdown);
    }
  }