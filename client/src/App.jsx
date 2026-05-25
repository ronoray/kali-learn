import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ToolPage from './pages/ToolPage.jsx';
import TerminalPage from './pages/TerminalPage.jsx';
import Layout from './components/Layout.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/tool/:id" element={<ToolPage />} />
      </Route>
      <Route path="/terminal" element={<TerminalPage />} />
    </Routes>
  );
}
