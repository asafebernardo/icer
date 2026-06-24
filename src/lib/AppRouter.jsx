import { BrowserRouter } from "react-router-dom";

export default function AppRouter({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
