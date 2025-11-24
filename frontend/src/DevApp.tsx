import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tool } from "./types";
import { Api } from "./api";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { NewspaperIcon, SendHorizonalIcon } from "lucide-react";
import aidio_cat from "@/assets/aidio_cat.jpg";
import ReportAudioPlayer from "./components/ReportAudioPlayer";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Spinner } from "./components/ui/spinner";
import { Select } from "./components/ui/select";
import ToolSelect from "./components/ToolSelect";
import { TranscriptionTest } from "./components/TranscriptionTest";
import { TranscriptionProvider } from "./lib/transcriptionContext";

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
  const { data: reportData } = useQuery<{ report: string }>({ queryKey: ["/latest-report"] });
  const { data: toolsData, isSuccess: isToolsSuccess } = useQuery<{ tools: Tool[] }>({ queryKey: ["/tools"] });

  const [yleNewsState, setYleNewsState] = useState<YleNewsState>({
    categories: [],
    selectedCategory: null,
    articles: [],
    selectedArticleUrl: null,
    articleContent: null,
  });

  // Effect to update categories once toolsData is available
  useEffect(() => {
    if (isToolsSuccess && toolsData) {
      const yleNewsTool = toolsData.tools.find(tool => tool.function.name === "yle_news");
      if (yleNewsTool && yleNewsTool.function.parameters && yleNewsTool.function.parameters.properties && yleNewsTool.function.parameters.properties.category) {
        const categories = yleNewsTool.function.parameters.properties.category.enum || [];
        setYleNewsState(prevState => ({ ...prevState, categories: categories as string[] }));
      }
    }
  }, [isToolsSuccess, toolsData]);


  const { mutateAsync: generateReport, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const response = await Api.post<{ report: string }>("/generate-report");
      return response;
    },
    onSuccess: (data, _, __, { client }) => {
      client.setQueryData(["/latest-report"], data);
    }
  })

  return (
    <TranscriptionProvider>
      <img src={aidio_cat} alt="AIdio Logo" className="mx-auto fixed top-0 -z-10 w-[100vw]" />

      <div className="bg-gradient-to-b from-background/0 via-background to-background/100 min-h-screen">
        <main className="text-foreground container mx-auto p-16">

          <div className="flex gap-8">

            <section className="my-4 flex-1">
              <h2 className="text-4xl font-semibold mb-4">Tools</h2>
              <ul className="space-y-4">
                {isToolsSuccess && toolsData.tools.map((tool, index) => (
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
                <Button variant="outline" className="backdrop-blur-md mr-4" onClick={() => generateReport()} disabled={isGenerating}><NewspaperIcon /> Generate new report {isGenerating && <Spinner />}</Button>
                <ReportAudioPlayer />
              </div>
              <TranscriptionTest />
              <article className="p-4 border rounded prose prose-invert font-serif backdrop-blur-lg">
                <Markdown remarkPlugins={[remarkGfm]}>{reportData?.report}</Markdown>
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
    </TranscriptionProvider>
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
  const [stadissaState, setStadissaState] = useState({
    selectedCategory: null as string | null,
  });

  const callTool = async (toolName: string, args: Record<string, unknown>) => {
    try {
      console.log("Calling tool:", toolName, args);
      const data = await Api.post(`/tools/${toolName}`, args);
       
      setResult((data as { result: any }).result);

      if (toolName === "yle_news") {
        if (args.category) {
          setYleNewsState(prevState => ({
            ...prevState,
            articles: (data as { result: { articles: YleNewsArticle[] } }).result.articles || [],
            selectedArticleUrl: null,
            articleContent: null,
            selectedCategory: args.category as string,
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
      {tool.function.name === "yle_news" || tool.function.name === "stadissa_tool" ? (
        <div className="mt-4">
          {tool.function.name === "yle_news" && (
            <>
              <ToolSelect
                label="Select a category"
                options={yleNewsState.categories}
                onValueChange={(value) => {
                  setYleNewsState(prevState => ({ ...prevState, selectedCategory: value }));
                  callTool(tool.function.name, { category: value });
                }}
                name="category"
                value={yleNewsState.selectedCategory}
              />
            </>
          )}

          {tool.function.name === "stadissa_tool" && (
            <>
              {tool.function.parameters.properties.category && (
                <>
                  <ToolSelect
                    label="Select a category"
                    options={(tool.function.parameters.properties.category.enum as string[])}
                    onValueChange={(value) => {
                      setStadissaState(prevState => ({ ...prevState, selectedCategory: value }));
                      callTool(tool.function.name, { category: value });
                    }}
                    name="category"
                    value={stadissaState.selectedCategory}
                  />
                </>
              )}
            </>
          )}
          {result && tool.function.name === "yle_news" && yleNewsState.articles.length > 0 && (
            <div className="mt-4 p-4 border rounded">
              <h4 className="font-semibold">News Articles:</h4>
              <ul className="space-y-2">
                {yleNewsState.articles.map((article: YleNewsArticle, index: number) => (
                  <li key={index}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
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

          {result && tool.function.name === "yle_news" && yleNewsState.selectedArticleUrl && yleNewsState.articleContent && (
            <div className="mt-4 p-4 border rounded">
              <h4 className="font-semibold">Article Content:</h4>
              <div className="[&_a]:text-blue-400 [&_a]:cursor-pointer [&_a]:hover:underline">
                <Markdown remarkPlugins={[remarkGfm]}>{yleNewsState.articleContent}</Markdown>
              </div>
            </div>
          )}
          {tool.function.name === "yle_news" && (
            <Button className="mt-4" variant="outline" type="button" onClick={() => {
              if (yleNewsState.selectedCategory) {
                callTool(tool.function.name, { category: yleNewsState.selectedCategory });
              }
            }}><SendHorizonalIcon /> Call Tool</Button>
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
