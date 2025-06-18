import { useState } from "react";
import { Link } from "react-router";

function Landing(){

    const [name, setName] = useState("")

    return(
        <>
            <input type="text" name="" id="" 
            onChange={(e) => setName(e.target.value)}/>

            <Link to={`/room?name=${name}`}>Join</Link>
        </>
    )
}

export default Landing;