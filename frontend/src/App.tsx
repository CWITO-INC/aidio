import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tool } from "./types";
import { Api } from "./api";
import { Button } from "./components/ui/button";
import { ThemeProvider } from "./components/ThemeProvider";
import { Input } from "./components/ui/input";
import { NewspaperIcon, SendHorizonalIcon } from "lucide-react";
import aidio_cat from "@/assets/aidio_cat.jpg";
import { Spinner } from "./components/ui/spinner";
import ReportAudioPlayer from "./ReportAudioPlayer";
import { Select, SelectItem } from "./components/ui/select";

interface YleNewsArticle {
  title: string;
  url: string;
  summary: string | null;
  id: string | null;
  published_at: string | null;
  author: string | null;
  categories: string[] | null;
}

interface YleNewsState {
  categories: string[];
  selectedCategory: string | null;
  articles: YleNewsArticle[];
  selectedArticleUrl: string | null;
  articleContent: string | null;
}

function App() {
  const [report, setReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);

  const [yleNewsState, setYleNewsState] = useState<YleNewsState>({
    categories: [],
    selectedCategory: null,
    articles: [],
    selectedArticleUrl: null,
    articleContent: null,
  });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const latestReportData = await Api.get("/latest-report");
          setReport(latestReportData.report);
      } catch (error) {
        console.error("Error fetching report:", error);
        setReport("Error fetching report");
      }
    };
    fetchReport();
  }, []);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const data = await Api.get("/tools");
        setTools(data.tools);

        const yleNewsTool = data.tools.find((tool: Tool) => tool.function.name === "yle_news");
        if (yleNewsTool && yleNewsTool.function.parameters.properties.category) {
          setYleNewsState(prevState => ({
            ...prevState,
            categories: yleNewsTool.function.parameters.properties.category.enum || [],
          }));
        }
      } catch (error) {
        console.error("Error fetching tools:", error);
        setTools([]);
      }
    };
    fetchTools();
  }, []);

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      const data = await Api.post("/generate-report");
      console.log(data)
      setReport(data.report);
    } catch (error) {
      console.error("Error generating report:", error);
      setReport("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <img src={aidio_cat} alt="AIdio Logo" className="mx-auto fixed top-0 -z-10 w-[100vw]" />

      <div className="bg-gradient-to-b from-background/0 via-background to-background/100 min-h-screen">
        <main className="text-foreground container mx-auto p-16">
          <h1 className="text-8xl font-bold mb-16 mt-80">AIdio</h1>

          <div className="flex gap-8">

            <section className="my-4 flex-1">
              <h2 className="text-4xl font-semibold mb-4">Tools</h2>
              <ul className="space-y-4">
                {tools.map((tool, index) => (
                  <li key={index} className="p-4 border rounded backdrop-blur-lg">
                    <ToolForm
                      tool={tool}
                      yleNewsState={yleNewsState}
                      setYleNewsState={setYleNewsState}
                    />
                  </li>
                ))}
              </ul>
            </section>
          
            <section className="my-4 flex-2">
              <div className="flex items-center mb-4">
                <h2 className="text-4xl font-semibold mr-4">Report</h2>
                <Button variant="outline" className="backdrop-blur-md mr-4" onClick={generateReport} disabled={isGenerating}><NewspaperIcon /> Generate new report {isGenerating && <Spinner />}</Button>
                <ReportAudioPlayer />
              </div>
              <article className="p-4 border rounded prose prose-invert font-serif backdrop-blur-lg [&_a]:text-foreground [&_a]:no-underline [&_a]:cursor-pointer [&_a]:hover:underline">
                <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
              </article>
            </section>
          </div>
        </main>
        <footer className="bg-background p-4 mt-16">
          <p className="text-center text-sm text-foreground/50">
            &copy; 2025 AIdio. All rights reserved.
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
}

const ToolForm = ({
  tool,
  yleNewsState,
  setYleNewsState,
}: {
  tool: Tool;
  yleNewsState: {
    categories: string[];
    selectedCategory: string | null;
    articles: YleNewsArticle[];
    selectedArticleUrl: string | null;
    articleContent: string | null;
  };
  setYleNewsState: React.Dispatch<React.SetStateAction<{
    categories: string[];
    selectedCategory: string | null;
    articles: YleNewsArticle[];
    selectedArticleUrl: string | null;
    articleContent: string | null;
  }>>;
}) => {
  const [result, setResult] = useState<string | null>(null);

  const callTool = async (toolName: string, args: Record<string, unknown>) => {
    try {
      console.log("Calling tool:", toolName, args);
      const data = await Api.post(`/tools/${toolName}`, args);
      setResult(data.result);

      if (toolName === "yle_news") {
        if (args.category) {
          setYleNewsState(prevState => ({
            ...prevState,
            articles: data.result.articles || [],
            selectedArticleUrl: null,
            articleContent: null,
            selectedCategory: args.category as string,
          }));
        } else if (args.article_url) {
          setYleNewsState(prevState => ({
            ...prevState,
            articleContent: data.result.article_content || "",
            selectedArticleUrl: args.article_url as string,
          }));
        }
      }
    } catch (error) {
      console.error("Error calling tool:", error);
      setResult("Error calling tool");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const args: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          args[key] = value;
        });
        callTool(tool.function.name, args);
      }}
    >
      <h3 className="font-semibold">{tool.function.name}</h3>
      <p>{tool.function.description}</p>
      {tool.function.name === "yle_news" ? (
        <div className="mt-4">
          <Select
            onValueChange={(value) => {
              console.log("Selected category:", value);
              setYleNewsState(prevState => ({ ...prevState, selectedCategory: value }));
              callTool(tool.function.name, { category: value });
            }}
            value={yleNewsState.selectedCategory || ""}
            className="w-[180px]"
          >
            <option value="" disabled>Select a category</option>
            {yleNewsState.categories.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </Select>
          <Button className="mt-4" variant="outline" type="button" onClick={() => {
            if (yleNewsState.selectedCategory) {
              callTool(tool.function.name, { category: yleNewsState.selectedCategory });
            }
          }}><SendHorizonalIcon /> Call Tool</Button>

          {result && yleNewsState.articles.length > 0 && (
            <div className="mt-4 p-4 border rounded">
              <h4 className="font-semibold">News Articles:</h4>
              <ul className="space-y-2">
                {yleNewsState.articles.map((article: YleNewsArticle, index: number) => (
                  <li key={index}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("Article title clicked:", article.url);
                        setYleNewsState(prevState => ({ ...prevState, selectedArticleUrl: article.url }));
                        callTool(tool.function.name, { article_url: article.url });
                      }}
                      className="text-primary underline-offset-4 hover:underline cursor-pointer hover:text-primary-foreground"
                    >
                      {article.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {yleNewsState.selectedArticleUrl && yleNewsState.articleContent && (
            <div className="mt-4 p-4 border rounded">
              <h4 className="font-semibold">Article Content:</h4>
              <div className="[&_a]:text-blue-400 [&_a]:cursor-pointer [&_a]:hover:underline">
                <Markdown remarkPlugins={[remarkGfm]}>{yleNewsState.articleContent}</Markdown>
              </div>
            </div>
          )}
        </div>
      ) : (
        Object.entries(tool.function.parameters.properties).map(
          ([paramName, paramDetails]) => (
            <div key={paramName} className="mt-4">
              <Input type="text" placeholder={`${paramName} (${paramDetails.type})`} name={paramName} />
            </div>
          ),
        )
      )}
      {tool.function.name !== "yle_news" && (
        <Button className="mt-4" variant="outline" type="submit"><SendHorizonalIcon /> Call Tool</Button>
      )}
      {result && tool.function.name !== "yle_news" && (
        <div className="mt-4 p-4 border rounded">
          <h4 className="font-semibold">Result:</h4>
          <p className="text-xs font-mono whitespace-pre-line">{result}</p>
        </div>
      )}
    </form>
  );
};

export default App;
