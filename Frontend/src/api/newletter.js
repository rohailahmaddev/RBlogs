// Newsletter API layer. Keeps network code out of the component.
// Replace the body of subscribeToNewsletter with your real endpoint, e.g.:
//
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/newsletter`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email }),
//   });
//   if (!res.ok) throw new Error((await res.json()).message || "Request failed");
//   return res.json();

export async function subscribeToNewsletter(email) {
  // Fake delay so you can see the loading state while developing.
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { ok: true, email };
}
