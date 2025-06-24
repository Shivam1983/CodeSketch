"use client"
export function AuthPage({isSignin}: {
    isSignin: boolean
}) {
    return <div className="w-screen h-screen flex justify-center items-center">
        <div className="p-6 m-2 bg-white rounded">
            <div className="p-2">
                <input type="text" placeholder="Email"/>
            </div>
            <hr></hr>
            <div className="p-2">
                <input type="password" placeholder="Password"/>
            </div>
            <hr></hr>
            <div className="p-2 flex justify-center">
                <button onClick={() => {

                }} className="bg-white text-black">{isSignin ? "Sign in": "Sign up"}</button>
            </div>
            <hr></hr>
        </div>
    </div>
}