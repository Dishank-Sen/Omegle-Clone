import {Routes, Route } from "react-router";
import Landing from "./components/Landing";
import About from "./components/About";
import Room from "./components/Room";

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/room" element={<Room />} />
      </Routes>
    </>
  )
}

export default App
