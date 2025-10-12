import { Link, Outlet } from "react-router";
import { Button } from "./components/ui/button";
import { AudioWaveformIcon, CodeXmlIcon } from "lucide-react";

function Layout() {
  return (
    <div className="flex">
      <nav className="text-gray-200 min-h-screen z-20 flex-none">
        <div className="p-4 flex flex-col space-y-4 fixed">
          <h1 className="text-lg font-bold font-stretch-50% uppercase">AIdio</h1>
          <Link to="/" className="flex items-center space-x-2 hover:text-white text-sm">
            <AudioWaveformIcon />
            <span>Home</span>
          </Link>
          <Link to="/dev" className="flex items-center space-x-2 hover:text-white text-sm">
            <CodeXmlIcon />
            <span>Developer</span>
          </Link>
        </div>
      </nav>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
