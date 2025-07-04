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
  
      // Set title with subtitle, author, and date if provided
      if (this.options.title) {
        const title = this.escapeLatex(this.options.title);
        const subtitle = "Generated by AI Report Agent";
        // Add the subtitle below the main title with some vertical space and adjusted font size
        preamble += `\\title{${title}\\\\[1em]\\large\\textit{${subtitle}}}\n`;
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
  
      content = this.convertHeaders(content);
      content = this.handleChapterDescriptions(content);
      content = this.addNewPageForChapters(content);
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
      content = this.escapeRemainingSpecialCharacters(content);
  
      return content;
    }
  
    private handleChapterDescriptions(content: string): string {
      const regex = /\\section\{(.+?)\}\s*\\subsection\{Description\}\s*([\s\S]+?)(?=\s*\\subsection|\s*\\section|\s*\\end\{document\})/g;
      return content.replace(regex, (match, sectionTitle, description) => {
          return `\\section{${sectionTitle}}\n\n${description.trim()}`;
      });
    }
  
    private addNewPageForChapters(content:string): string {
        let processedContent = content.replace(/\\section/g, '\\clearpage\n\\section');
        if (processedContent.trim().startsWith('\\clearpage\n')) {
            processedContent = processedContent.trim().substring('\\clearpage\n'.length);
        }
        return processedContent;
    }
  
    private convertHeaders(content: string): string {
      return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
        const level = hashes.length;
        const cleanTitle = this.escapeLatex(title.trim());
  
        switch (level) {
          case 1:
            return `\\section{${cleanTitle}}`;
          case 2:
            return `\\subsection{${cleanTitle}}`;
          case 3:
            return `\\subsubsection{${cleanTitle}}`;
          case 4:
            return `\\paragraph{${cleanTitle}}`;
          case 5:
            return `\\subparagraph{${cleanTitle}}`;
          case 6:
            return `\\textbf{${cleanTitle}}`;
          default:
            return `\\section{${cleanTitle}}`;
        }
      });
    }
  
    private convertCodeBlocks(content: string): string {
      return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        const cleanCode = code.trim();
        return `\\begin{verbatim}\n${cleanCode}\n\\end{verbatim}`;
      });
    }
  
    private convertMathBlocks(content: string): string {
      return content.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, (match, math) => {
        return `\\[\n${math.trim()}\n\\]`;
      });
    }
  
    private convertInlineMath(content: string): string {
      return content.replace(/\$([^$\n]+)\$/g, (match, math) => {
        return `$${math}$`;
      });
    }
  
    private convertLists(content: string): string {
      const lines = content.split('\n');
      const result: string[] = [];
      let inList = false;
      let listStack: Array < {
        type: 'itemize' | 'enumerate',
        level: number
      } > = [];
  
      for (const line of lines) {
        const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
        const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
  
        if (unorderedMatch || orderedMatch) {
          const indent = (unorderedMatch || orderedMatch)![1].length;
          let itemContent = (unorderedMatch || orderedMatch)![2];
          const itemType = unorderedMatch ? 'itemize' : 'enumerate';
          const currentLevel = Math.floor(indent / 2);
  
          if (!inList || currentLevel > listStack.length - 1) {
            listStack.push({
              type: itemType,
              level: currentLevel
            });
            result.push(`${'  '.repeat(currentLevel)}\\begin{${itemType}}`);
            inList = true;
          } else if (currentLevel < listStack.length - 1) {
            while (listStack.length > 0 && listStack[listStack.length - 1].level > currentLevel) {
              const closingList = listStack.pop()!;
              result.push(`${'  '.repeat(closingList.level)}\\end{${closingList.type}}`);
            }
            if (listStack.length === 0) {
              inList = false;
            }
          }
          result.push(`${'  '.repeat(currentLevel + 1)}\\item ${this.escapeLatex(itemContent)}`);
        } else {
          if (inList) {
            while (listStack.length > 0) {
              const closingList = listStack.pop()!;
              result.push(`${'  '.repeat(closingList.level)}\\end{${closingList.type}}`);
            }
            inList = false;
          }
          result.push(line);
        }
      }
  
      while (listStack.length > 0) {
        const closingList = listStack.pop()!;
        result.push(`${'  '.repeat(closingList.level)}\\end{${closingList.type}}`);
      }
  
      return result.join('\n');
    }
  
    private convertBlockquotes(content: string): string {
      return content.replace(/^>\s+(.+)$/gm, (match, text) => {
        return `\\begin{quote}\n${this.escapeLatex(text)}\n\\end{quote}`;
      });
    }
  
    private convertLinks(content: string): string {
      return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `\\href{${url}}{${this.escapeLatex(text)}}`;
      });
    }
  
    private convertImages(content: string): string {
      return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        const caption = alt ? `\\caption{${this.escapeLatex(alt)}}` : '';
        return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${src}}\n${caption}\n\\end{figure}`;
      });
    }
  
    private convertTextFormatting(content: string): string {
      content = content.replace(/\*\*([^*]+)\*\*/g, (match, text) => `\\textbf{${this.escapeLatex(text)}}`);
      content = content.replace(/__([^_]+)__/g, (match, text) => `\\textbf{${this.escapeLatex(text)}}`);
      content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (match, text) => `\\textit{${this.escapeLatex(text)}}`);
      content = content.replace(/(?<!_)_([^_]+)_(?!_)/g, (match, text) => `\\textit{${this.escapeLatex(text)}}`);
      content = content.replace(/`([^`]+)`/g, (match, text) => `\\texttt{${this.escapeLatex(text)}}`);
  
      return content;
    }
  
    private convertHorizontalRules(content: string): string {
      return content.replace(/^---+$/gm, '\\noindent\\rule{\\textwidth}{0.4pt}');
    }
  
    private cleanupWhitespace(content: string): string {
      return content.replace(/\n\s*\n/g, '\n\n');
    }
  
    private escapeRemainingSpecialCharacters(content: string): string {
      const specialChars: {
        [key: string]: string
      } = {
        '&': '\\&',
        '%': '\\%',
        '#': '\\#',
      };
  
      for (const [char, replacement] of Object.entries(specialChars)) {
        const regex = new RegExp(`\\${char}`, 'g');
        content = content.replace(regex, replacement);
      }
      return content;
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
  
    public setOptions(options: Partial < LaTeXOptions > ): void {
      this.options = { ...this.options,
        ...options
      };
    }
  
    public static generateDocument(
      markdown: string,
      options: LaTeXOptions = {}
    ): string {
      const service = new LaTeXService(options);
      return service.convertToLaTeX(markdown);
    }
}