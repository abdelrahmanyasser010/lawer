import { redirect } from "next/navigation";

export default function ReviewsPage(){
  redirect("/work?serviceType=contract_review");
}
