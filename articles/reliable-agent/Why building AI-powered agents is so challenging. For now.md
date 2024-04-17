# Why building AI-powered agents is so challenging. For now.

3 February 2024

-   [](https://twitter.com/share?url=https://www.ben-morris.com/why-building-ai-powered-agents-is-so-challenging-for-now/)
-   [](https://www.linkedin.com/sharing/share-offsite/?url=https://www.ben-morris.com/why-building-ai-powered-agents-is-so-challenging-for-now/)
-   [](https://www.facebook.com/sharer.php?u=https://www.ben-morris.com/why-building-ai-powered-agents-is-so-challenging-for-now/)

There's growing excitement around the potential for building systems from autonomous and intelligent _"agents"_ that collaborate to solve problems. The idea of agentic (agent-based) architecture has been around [for a while](https://link.springer.com/chapter/10.1007/BFb0013570), though the development of Large Language Models (LLMs) has suggested that this style of system might finally be within reach.

In an agentic architecture, individual agents are responsible for determining the intent of a request and planning a response. They have the capacity for self-reflection and memory that allows them to correct mistakes. They can also leverage tools that give them capabilities such as calling APIs or querying databases. Collectively, they can adapt to their environment and achieve goals with limited supervision.

This could give rise to systems where agents with very different perspectives and capabilities work together to solve a problem. This is potentially very powerful when you consider that diverse teams tend to produce better outcomes. Agents could also have the capacity to improve their capabilities over time and find novel ways to solve problems.

Despite the growing excitement in this area, there are [many difficulties](https://arxiv.org/pdf/2312.14231.pdf) associated with building agents on any scale. Although these are likely to become solved problems in time, agentic systems may not be quite ready for prime time.

## Familiarity, or the lack of it

The biggest challenge is that this is all so _new_. There are no established patterns or widely-accepted best practices for building agents. When you design microservice based architectures then you have a wealth of different perspectives to draw on, established heuristics, and even battle-tested modelling techniques (e.g. Domain Driven Design). For agentic architecture it feels that the engineering community is very much finding its way through a fog of preprint academic papers and sub-reddits.

That said, there are early signs of emerging patterns and frameworks. [Retrieval Augmented Generation](https://aws.amazon.com/what-is/retrieval-augmented-generation/) (RAG) already feels like a commodity solution with a growing body of practical experience around it. Some of the frameworks in the agent space are attracting large communities and getting formal releases (e.g. [Langchain](https://www.langchain.com/) and [LlamaIndex](https://www.llamaindex.ai/)) though they may take some time to reach a mature state.

## Workflow, failure, and harm

Modern software engineering is predicated on predictable and deterministic systems. You can identify the different execution paths, build test suites to verify them, write code to implement them, and automate to guard against regression.

LLMs are not like the standardised systems that we are accustomed to. They forget things, give inconsistent responses, occasionally hallucinate, and are easily duped. Agents work by placing these unreliable models at the very heart of system workflow and task orchestration. The idea of handing control of system workflow to something so unpredictable can be quite an alarming prospect.

There are numerous [governance issues](https://cdn.openai.com/papers/practices-for-governing-agentic-ai-systems.pdf) that need to be ironed out in agentic systems. There is a very real risk of harm as when agentic systems fail, they may do so both catastrophically and _silently_. Agent failure can be a slippery concept that can be difficult to capture. There needs to be some means of verifying that an agent is suitable for a particular task as well as assessing any outputs for accuracy and reliability.

There should be some awareness of the potential harm that an agent can do and safeguards put in place to mitigate, such as manual approvals for bigger risk areas. There are plenty of horror stories of algorithmic trading systems going out of control and racking up huge losses – this risk is particularly acute in agentic systems. You may need a backstop mechanism that shuts an agent down in specific circumstances, which may be difficult to achieve gracefully.

## Prompt engineering

For the most part, an agent lives and dies on the quality of the prompts and configuration settings that are provided to it. [Prompt engineering](https://platform.openai.com/docs/guides/prompt-engineering/strategy-write-clear-instructions) feels like an erratic and immature way of instructing a system. Composing effective prompts is a time-consuming and iterative process that requires a lot of trial and error. It can be more of an art than a science, which is challenging for engineers who are accustomed to defining specific instructions for systems - and expecting them to be followed.

This apparently lax approach can be particularly awkward when you need to assert a consistent data format. Models can refuse to conform to a supplied schema, invent new data structures, use uneven formatting, and adopt an erratic approach to measurements (e.g. interchangeable currencies or weights and measures). Sometimes you are forced to fall back on less structured and more human-readable formats that models seem more comfortable with using.

The development workflow can be challenging as prompts are often embedded into compiled applications, making code bases somewhat unwieldy. Emerging visual tools in this space such as [Langflow](https://www.langflow.org/) for [Flowise](https://flowiseai.com/) might make for easier experimentation, but like most ["low code" tools](https://www.ben-morris.com/why-low-code-and-no-code-platforms-are-like-japanese-knotweed/) they can struggle with more complex use cases. Once you have developed some reliable prompts there can follow a tedious process of optimisation where you balance verbosity against token consumption and performance.

## Earthier concerns: testing, monitoring, and performance

You also face the challenge of testability, or rather the lack of it. LLMs tend to be extremely sensitive to phrasing where small changes in prompts can have unintended consequences. This makes regression a real problem, but one that's hard to solve in the absence of clearly defined execution paths. An agent might be expected to cater for a potentially vast range of use cases that might be difficult to anticipate and articulate.

Even if you can isolate some meaningful use cases, every test for prompts is likely to be a flaky test. How do you write a test when each result may be different? Subtle changes in inputs can lead to significant differences in outputs. There could also be a wide range of potential responses that are technically correct, so it may be wisest to focus on the _properties_ of a result rather than the specific content.

Monitoring presents another challenge. Agents often appear as "black boxes" that reveal very little of their thinking processes. If a user is going to accept the output of an agentic system, then they may demand to see the chain of thought that went into producing the result. In a compliance environment you may need to provide an audit log that identifies the agents that made specific decisions.

As things stand, LLMs are a slow and relatively expensive resource. An agent-based application will need to make multiple LLM calls to plan solutions, execute tasks, and format responses. The performance and cost implications of this are potentially foreboding, though models will get faster and cheaper while frameworks get better at parallelising calls. There remains an as-yet-unsolved performance challenge for anybody hoping to build responsive user experiences from multiple, collaborating agents.

## Magical thinking and volatility

There can be a tendency to get carried away with the capabilities of LLMs. We may be in danger of ascribing a little too much intelligence to them. After all, LLMs work by estimating the probability distribution of word sequences. There is no wider process of understanding, creativity, or insight. They are just estimating which word is most likely to follow another given the wealth of data they have been trained on.

Agents need to adapt to changing circumstances and solve new problems on the fly. We may be trying to squeeze LLMs into something that they don't _quite_ fit. The models may be continuously improving, but it requires a degree of blind faith to assume that they will eventually provide the kind of general problem-solving intelligence that agent-based architectures arguably need.

The ecosystem around agents and LLMs is fast-moving and volatile, which can be intimidating. Will prompt engineering be a skill that has any value at all next year, or a quaint anachronism? The lack of established best practice is particularly unnerving. The idea of building a new generation of intelligent applications that can solve problems in novel ways may feel within reach, it's just that hardly anybody is doing this on any scale right now.

It may be that we're not quite ready to be able to build agentic architectures. LLMs are too idiosyncratic, the coding frameworks with are too immature, the development process too clunky, and there are just too many unsolved problems. Give it a few years though...?