import * as Utils from "./utils.ts";

export type ScoringFunction = (qtype: QuestionType, maxScore: number, numberOfCorrectOptions: number, numberOfDecoyOptions : number, selectedCorrect : number, selectedWrong : number) => number;

export enum QuestionType {
	SingleAnswer,    // one of N
	MultipleAnswers, // M of N
	NoAnswer         // There is no quiz answer
}


export class Question {
	private static QuestionCount : number = 0;
	private QID : number;

	constructor(
		private type: QuestionType, 
		private question : string,
		private questionMedia : string | null,
		private correctAnswers: Array<string>, 
		private decoyAnswers: Array<string>,
		private maxWorth: number,
		private explanation: string | null
	) {
		this.QID = Question.GenerateNewQuestionID();

		// Test if the same answer is both a correct and decoy answer:
		Utils.Assert( Utils.HasCommonItem<string>(correctAnswers, decoyAnswers) == false, "The same answer cannot be correct and false at the same time!");

		switch(this.type) {
			case QuestionType.NoAnswer:
				Utils.Assert(correctAnswers.length == 0 && decoyAnswers.length == 0, "No answer questions cannot have any answers!");
				Utils.Assert(maxWorth == 0, "No answer questions cannot have worth!");
				break;
			
			case QuestionType.SingleAnswer:
				Utils.Assert(correctAnswers.length == 1, "Single answer questions cannot have multiple correct answers!");
				Utils.Assert(maxWorth > 0, "Questions with answers must be worth something! Attempted worth: " + maxWorth);
				break;

			case QuestionType.MultipleAnswers:
				Utils.Assert(maxWorth > 0, "Questions with answers must be worth something!");
				break;
		}


	}

	public GenerateHTML(prefix: string | null) : string {
		let out : string = "<div class='QuestionBox Unanswered Q" + this.GetTypeString() + "' id='Q" + this.GetIDString() + "'>";

		if(prefix) out += "<div class='QuestionNumber'>" + prefix + ")</div>";
		out += this.GenerateQuestionDivString();
		out += this.GenerateAnswerDivString();
		out += "<div class='Explanation'></div>";

		return out + '</div>';
	}

	// returns: [score, max_score]
	public EvaluateAnswer(scoringFunction : ScoringFunction) {
		const idCore : string = this.GetIDString();

		let questionBox = document.getElementById("Q" + idCore) as HTMLDivElement | null;
		let answers = document.getElementById("A" + idCore) as HTMLDivElement | null;

		// question wasn't found or has no answer
		if(questionBox === null || answers === null) return [0,0];
		// question was found
		
		let labels = answers.children[0].children as HTMLCollection;
		let answeredCorrectly = 0;
		let answeredWrongly   = 0;

		for(let label of labels) {
			// data
			const checkboxOrRadio : HTMLInputElement = label.children[0] as HTMLInputElement;
			const isChecked = (label.children[0] as HTMLInputElement).checked as boolean;
			const answer = (label.children[1] as HTMLSpanElement).innerText;
			const isCorrectChoice : boolean = this.IsAnswerCorrect(answer, isChecked);
			
			// functional code
			if(isCorrectChoice) {
				answeredCorrectly++;
			} else {
				answeredWrongly++;
			}

			// visual code
			label.classList.remove("Unanswered", "Correct", "Wrong");
			
			if(isChecked) {
				if(isCorrectChoice) {
					label.classList.add("Correct");
				} else {
					label.classList.add("Wrong");
				}
			} else {
				if(isCorrectChoice === false) {
					label.classList.add("Wrong");
				}
			}
		}
		let questionScore = scoringFunction(this.type, this.maxWorth, this.correctAnswers.length, this.decoyAnswers.length, answeredCorrectly, answeredWrongly);
		questionBox.classList.remove("Unanswered", "Correct", "Wrong");

		if(this.maxWorth === questionScore) { 
			questionBox.classList.add("Correct");
		} else {
			questionBox.classList.add("Wrong");
		}

		// print explanation
		if(this.explanation) {
			(questionBox.lastChild as HTMLDivElement) .innerHTML = this.explanation;
			console.log(this.explanation);
		}
		return [questionScore, this.maxWorth];
	};

	private IsAnswerCorrect(answer : string, marked : boolean) : boolean {
		return (marked === this.correctAnswers.includes(answer));
	} 


	//* Helper functions
	private GenerateQuestionDivString() : string {
		let out : string = "<div class='Question'>";

		out += this.question;
		if(this.questionMedia) out += "<br>" + this.questionMedia;

		return out + "</div>";
	}

	private GenerateAnswerDivString() : string {
		if(this.type === QuestionType.NoAnswer) return "";

		let out : string = "<div class='Answers' id='A" + this.GetIDString() + "'><form>";

		let possibleAnswers : Array<string> = [];

		for(let correctAnswer of this.correctAnswers) {
			possibleAnswers.push(correctAnswer);
		}
		for(let decoyAnswer of this.decoyAnswers) {
			possibleAnswers.push(decoyAnswer);
		}

		Utils.Shuffle<string>(possibleAnswers);

		let inputType : string;
		if(this.type === QuestionType.SingleAnswer) {
			inputType = "radio";
		} else {
			inputType = "checkbox";
		}


		for(let answer of possibleAnswers) {
			out += "<label class='Unanswered'><input type='" + inputType + "' name='" + this.GetIDString() + "'> <span class='AnswerText'>" +  answer + "</span><br></label>";
		}

		return out + "</form></div>";
	}
	
	
	public GetIDString() : string {
		return this.GetTypeString() + this.QID.toString();
	}
	
	private GetTypeString() : string {
		switch(this.type) {
			case QuestionType.SingleAnswer:
				return "SA";
				
			case QuestionType.MultipleAnswers:
				return "MA";
				
			case QuestionType.NoAnswer:
				return "NA";
		}
		Utils.Assert(false, "Should be unable to get here!");
	}

	//* Static members:

	private static GenerateNewQuestionID() : number {
		Question.QuestionCount++;
		return Question.QuestionCount-1;
	}
}

export class QuestionBank {
	private activeQuestions : Array<Question> = [];
	private questions : Array<Question>;

	constructor(jsonString : string | null = null) {
		if(!jsonString) this.questions = [];
		else {
			this.questions = JSON.parse(jsonString) as Array<Question>;
		}
	}

	public GetJSON() : string {
		return JSON.stringify(this.questions);
	}

	// Add single answer question
	public AddSA(question : string, questionMedia : string | null, correctAnswer: string, decoyAnswers: Array<string>, explanation: string | null, questionWorth: number) {
		this.questions.push(new Question(QuestionType.SingleAnswer, question, questionMedia, [correctAnswer], decoyAnswers, questionWorth, explanation));
	}

	// Add single answer question
	public AddMA(question : string, questionMedia : string | null, correctAnswers: Array<string>, decoyAnswers: Array<string>, explanation: string | null, questionWorth: number) {
		if(questionWorth != 1) {
			// ###
		}
		
		this.questions.push(new Question(QuestionType.MultipleAnswers, question, questionMedia, correctAnswers, decoyAnswers, questionWorth, explanation));
	}
	
	public AddNA(question : string, questionMedia : string | null, explanation : string | null) {
		this.questions.push(new Question(QuestionType.NoAnswer, question, questionMedia, [], [], 0, explanation));
	}
	
	public ShuffleQuestions() {
		Utils.Shuffle(this.questions);
	}

	public Generate(count : number, enableQuestionNumberPrefix: boolean) : string {
		this.ShuffleQuestions();
		
		this.activeQuestions = [];
		let out : string = "";
		count = Math.min(this.questions.length, count);
		for(let i = 0; i < count; i++) {
			out += this.questions[i].GenerateHTML( enableQuestionNumberPrefix? (i+1).toString() : null);
			this.activeQuestions.push(this.questions[i]);
		}
		return out;
	}

	// Returns array [0 => achievedScore, 1 => maxScore, 2 => IDs of not fully correct questions]
	public CheckAnswers(scoringFunction: ScoringFunction) {
		let score : number = 0;
		let maxScore : number = 0;

		// stores IDs
		let notFullyCorrect: Array<string> = []; 

		for(let i = 0; i < this.activeQuestions.length; i++) {
			let res : any = this.activeQuestions[i].EvaluateAnswer(scoringFunction);
			if(res[0] != res[1]) {
				// not 100% correct
				notFullyCorrect.push(this.activeQuestions[i].GetIDString());
			}

			score += res[0];
			maxScore += res[1];
		}

		return [score, maxScore, notFullyCorrect];
	}
};





const ScoringFunction_AllOrNothing: ScoringFunction =  (qtype: QuestionType, maxScore: number, numberOfCorrectOptions: number, numberOfDecoyOptions : number, selectedCorrect : number, selectedWrong : number) => {
	// console.log(
	// 	"\nqtype: " + qtype,
	// 	"\nmaxScore: " + maxScore,
	// 	"\nnumberOfCorrectOptions: " + numberOfCorrectOptions,
	// 	"\nnumberOfDecoyOptions: " + numberOfDecoyOptions,
	// 	"\nselectedCorrect: " + selectedCorrect,
	// 	"\nselectedWrong: " + selectedWrong
	// );
	
	
	if(selectedWrong == 0) {
		return maxScore;
	} else {
		return 0;
	}
}

export enum InbuiltScoringFunction {
	AllOrNothing = "ScoringFunction_AllOrNothing",
}

const InbuiltScoringFunctions: Record<InbuiltScoringFunction, ScoringFunction> = {
	[InbuiltScoringFunction.AllOrNothing]: ScoringFunction_AllOrNothing,
};

export function GetScoringFunction(name : InbuiltScoringFunction) : ScoringFunction {
	return InbuiltScoringFunctions[name];
}