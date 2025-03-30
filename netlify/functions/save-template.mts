import type { Context } from "@netlify/functions";
import {simpleGit} from 'simple-git';

export default async (req: Request, context: Context) => {
	// throw error if method is not POST
	if (req.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}
	
	try {
		const data = await req.json();
		
		return new Response(JSON.stringify({result: data}), {
			status: 200
		})
	} catch(e) {
		return new Response(JSON.stringify({
			message: 'Internal Error'
		}), {
			status: 500
		})
	}
}
