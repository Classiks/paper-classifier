import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { useModelSettingsStore, useApiKeyStore } from "./settingsStore";

// Define enums and schemas for the AI response
export const IncludeEnum = z.union([z.literal(0), z.literal(1)]);
export const ReasonGroupEnum = z.enum([
  // Reason groups per coding manual
  "aspiration",        // for intentions, plans, interest
  "choice",            // for decisions or choices
  "retention",         // for retention or persistence
  "preparation",       // for preparation activities
  "attrition",         // for dropout or attrition
  "trajectory",        // for paths or pathways
]);
export const ReasonClarificationEnum = z.union([
  z.literal("degree"),
  z.literal("career"),
  z.literal("course"),
  z.literal("enrollment"),
]);

export const ReasonDetail = z.object({
  group: ReasonGroupEnum,
  clarification: ReasonClarificationEnum.optional(),
});
export const DesignEnum = z.union([
  z.literal(1), // quantitative
  z.literal(2), // qualitative
  z.literal(3), // mixed-methods
  z.literal(4), // review/meta-analysis
  z.literal(5), // theoretical
  z.literal(6), // descriptive/report
]);
export const EducationalLevelEnum = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const CodingSchema = z.object({
  include: IncludeEnum,
  reason: ReasonDetail.array().optional(),
  subject: z.array(z.string()).optional(),
  design: DesignEnum.optional(),
  educationalLevel: EducationalLevelEnum.array().optional(),
  _confidence: z.number().optional(),
  _reasoning: z.string().optional(),
});

export type CodingResult = z.infer<typeof CodingSchema>;

export interface PaperInput {
  title: string,
  abstract: string
}

export interface PaperWithCoding {
  paper: PaperInput,
  coding: CodingResult
}

// System prompt: coding manual + target JSON schema
const systemInstruction = `
You are an AI trained to code educational research papers according to the Keytopic 2025 coding manual for "Engaging and retaining students in STEM education".

Here is the coding manual:

--- START OF MANUAL

Keytopic 2025 – Engaging and retaining students in STEM education

# Coding Manual

## Criteria

### Inclusion criteria

1. STEM subject
  a. science
  b. technology
  c. engineering
  d. mathematics
  e. biology
  f. chemistry
  g. physics
  h. computer science
  i. STEM
  j. Programming
  k. Medical science
  l. Pharmacy
  m. Anatomy
2. Educational context (Pre-K12 to higher education)
  a. student
  b. school
  c. college
  d. university
  e. after-school
  f. out-of-school
  g. undergraduate
  h. graduate
  i. kindergarten
  j. K12
  k. PreK12
  l. education
  m. initiative
3. From 2015 onwards
4. Topic: pathways (or similar), choices/intentions (or similar), retention (or similar) + career,
academic, major, occupation, college, etc.

### Exclusion criteria
  1. No STEM reference (e.g. social sciences, health sciences, nursing --&gt; care-related occupations
  are excluded, but we include life sciences and medical sciences which require knowledge in
  STEM subjects)
  2. No educational context (e.g. economy, organizations)
  3. Before 2015
  4. Topic other than career pathways, choices/intentions, retention etc. (or similar)
  5. Motivation, interest, and engagement without any connection to inclusion point 4


## Coding Categories

Category coding: Details on…
1. Reason for coding (e.g. career aspiration, degree choice)
2. STEMM subject (e.g. mathematics, STEM, medical science)
3. Educational level (e.g. school, higher education, adults)
4. Research design (e.g. quantitative, mixed methods, theoretical)

### Inclusion:

For inclusion: 1 – included, 0 – excluded.

### Reason for in-/exclusion:

For Reason for coding: write down the group name of reason(s) plus clarification. (e.g., "course choice", "degree aspiration"). Separate the reasons with a comma

Group Name:
  - aspiration: for aspiration/s, intention/s, interest/s or plan/s
  - choice: for choice/s or decision/s
  - retention: for retention or persistence (here, no clarification mandatory)
  - preparation
  - attrition: for attrition or dropout
  - trajectory: for trajectory/ies or path/pathway

Clarifications:
  - degree: for major or degree (The code "degree" refers to the duration and/or completion of a major)
  - career: for career or job
  - course: for course taking or specific choices, short term on a specific subject like a math course for engineering majors in university (which are not degree or career choices)
  - enrollment: for enrollment or signing up for a university or school program or course. It could be enrollment + one of the main categories if mentioned. For example, enrollment choice

### STEMM subject:

Write down the STEMM subjects explicitly (e.g. "mathematics", "STEM"), if applicable, add multiple values separated with a comma

Note for the subject
- if a paper presents results for two distinct focus areas (e.g., mathematics and STEM), code both.
- However, if STEM is mentioned only in the introduction or title but the analysis clearly focuses on a single domain (e.g., mathematics), then code only the specific focus area.
- Code the exact wording of the paper, not the general subject, for example put down "maritime" that is mentioned in paper not science.
- In the case of the subject in the medical field, we should all code medical science.

### Educational level:

1 – included in the K-12 range, 
2 – higher education (also PhD students), 
3 – vocational/related to an occupation. 

- If the research spans multiple levels, add multiple values separated with a comma
- double coding is possible (e.g., age 15-24 would be coded for K-12 and higher education)

### Research design:

1 – quantitative, 
2 – qualitative, 
3 – mixed-methods, 
4 – review/meta-analysis,
5 – theoretical articles, 
6 – "blabla" paper (descriptive paper, reports, etc.)


## Examples:
- "we researched high school students intentions to major in a STEM subject"
    - code: degree intention
- "we assessed whether choosing a career depended on..."
    - code: career choice

## Possible codes (not exhaustive at all!)
- degree intention
- degree choice
- career interest
- career choice
- academic choice
- educational intention
- educational trajectory
- educational pathway

Multiple codings are separated by a comma.

## Notes for the educational level:
a) we code the level according to the level of the sample population (example: if a paper researches the
major intention of high school kids, the coding will be a 1, meaning K-12 related)
b) PhD students fall into the category of higher education (coded 2)

--- END OF MANUAL

Your output must be valid JSON matching this schema:
{
  include: 0 | 1,                              // 1 if included, 0 if excluded
  reason?: [                                   // optional, required only if include=1
    {
      group: one of ["aspiration","choice","retention","preparation","attrition","trajectory"],
      clarification?: one of ["degree","career","course","enrollment"]
    },
    ...
  ],
  subject?: [string],                          // list of STEMM subjects (e.g., "mathematics", "STEM") if include=1
  design?: 1 | 2 | 3 | 4 | 5 | 6,              // research design code, only if include=1
  educationalLevel?: [1 | 2 | 3],              // 1=K-12, 2=higher ed, 3=vocational, only if include=1
  _confidence?: number,                        // 0–100 confidence score of the classification
  _reasoning?: string                          // your private chain-of-thought if desired
}

Return only the JSON object, nothing else.`;

// Example requests and simulated responses
const examples: PaperWithCoding[] = [
  {
    paper: {
      title: "Heterogeneous Major Preferences for Extrinsic Incentives: The Effects of Wage Information on the Gender Gap in STEM Major Choice",
      abstract: "Despite the growing evidence of informational interventions on college and major choices, we know little about how such light-touch interventions affect the gender gap in STEM majors. Linking survey data to administrative records of Chinese college applicants, we conducted a large-scale randomized experiment to examine the STEM gender gap in the major preference beliefs, application behaviors, and admissions outcomes. We find that female students are less likely to prefer, apply to, and enroll in STEM majors, particularly Engineering majors. In a school-level cluster randomized controlled trial, we provided treated students with major-specific wage information. Students' major preferences are easily malleable that 39% of treated students updated their preferences after receiving the wage informational intervention. The wage informational intervention has no statistically significant impacts on female students' STEM-related major applications and admissions. In contrast, those male students in rural areas who likely lack such information are largely shifted into STEM majors as a result of the intervention. We provide supporting evidence of heterogeneous major preferences for extrinsic incentives: even among those students who are most likely to be affected by the wage information (prefer high paying majors and lack the wage information), female students are less responsive to the informational intervention."
    },
    coding: {
      include: 1,
      reason: [
        { group: "choice", clarification: "degree" }
      ],
      subject: ["STEM"],
      design: 1,
      educationalLevel: [1, 2],
      _confidence: 96,
      _reasoning: "This is a cluster randomized controlled trial directly manipulating wage information to observe changes in STEM major preference and application behavior, fitting the 'degree choice' category at both secondary and tertiary levels."
    }
  },
  {
    paper: {
      title: "Influence of career orientations and career guidance need on students' employability attributes",
      abstract: "This study explored the interplay between students' career orientations and career guidance need in relation to their employability attributes of graduateness and personal employability qualities. Applying a cross-sectional design, 369 black South African students at a university of technology were sampled for the study. The students completed an adapted version of the Career Orientations Inventory and the Employer Employability Competency Expectations scale. Results following tests for significant mean differences and moderated regression analysis revealed that clarity on career orientation preferences is associated with a high need for career guidance. Career orientations predicted employability attributes more than the need for career guidance. Students with a high career orientation preference had significantly more positive perceptions of their graduateness and personal employability qualities than those with a low career orientation preference. Students with a low career orientation preference and weak desire for career guidance had a significantly weaker awareness of their employability attributes. Premised on the dispositional model of employability, the findings suggest the need for career guidance in employability learning and development to help students gain insight into their career orientation preferences and personal employability qualities."
    },
    coding: {
      include: 0,
      _confidence: 92,
      _reasoning: "Cross-sectional study of employability attributes rather than an intervention or measurement of major/career choice outcomes; not specific to STEM or degree decisions."
    }
  },
  {
    paper: {
      title: "State Implementation of SNAP Waivers and Flexibilities During the COVID-19 Pandemic: Perspectives From State Agency Leaders",
      abstract: "Objective: To describe state agencies' implementation of the Supplemental Nutrition Assistance Program (SNAP) during the first year of the coronavirus disease of 2019 (COVID-19) pandemic, barriers and facilitators to SNAP implementation, and recommendations to improve SNAP implementation.Design: Qualitative methodology guided by Bullock's determinants of policy implementation framework using 7 semistructured, virtual focus groups in April 2021.Setting: Twenty-six states representing all 7 US Department of Agriculture Food and Nutrition Service regions.Participants: Four focus groups with state-level SNAP administrators and 3 focus groups with state-level SNAP supportive services (Supplemental Nutrition Assistance Program-Education, Employment & Training, and Outreach) supervisors (n = 62).Phenomenon of Interest: Supplemental Nutrition Assistance Program implementation during the COVID-19 pandemic. Analysis: Thematic analysis using a phronetic iterative approach. Results: Six primary themes emerged: the policy response, technology needs, collaboration, participant communication, funding realities, and equity. Implementation challenges included the design of waivers in the early pandemic response, inadequate federal guidance and funding, outdated technology, and pre-pandemic regulations limiting state authority. Modernized technology systems, availability of virtual programming, partnerships, and enhanced benefits facilitated SNAP implementation.Conclusions and Implications: Supplemental Nutrition Assistance Program administrators adapted their programs to deliver services virtually during the COVID-19 pandemic. These experiences highlighted the importance of certain policy determinants, such as modernized technology and streamlined application processes, to improve outcomes for SNAP participants and staff."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Qualitative policy-implementation focus with agency leaders, not assessing student career choices or STEM educational outcomes."
    }
  },
  {
    paper: {
      title: "Improving Career Decision Self-Efficacy and STEM Self-Efficacy in High School Girls: Evaluation of an Intervention",
      abstract: "This study evaluated whether a career group intervention that incorporates the four sources of self-efficacy and addresses perceived career barriers is effective at improving the career decision self-efficacy and science, technology, engineering, and mathematics (STEM) self-efficacy for adolescent girls. Of the 88 girls in our study, 42 students were Latina and 46 were White, 40 were freshman, and 48 were sophomores attending the same high school. From this sample, 44 of these girls participated in a 9-week treatment group. Using repeated measures analysis of covariance with ethnicity and grade as covariates, results indicated that, compared with the control group (n = 44), participants in the treatment group improved significantly on variables of career decision self-efficacy and STEM self-efficacy and increased those gains at 3-month follow-up. The discussion focuses on implications for career counseling, limitations of the study, and future research."
    },
    coding: {
      include: 1,
      reason: [
        { group: "choice", clarification: "career" }
      ],
      subject: ["STEM"],
      design: 1,
      educationalLevel: [1],
      _confidence: 97,
      _reasoning: "Quasi-experimental intervention with treatment and control arms in high school, directly measuring career decision and STEM self-efficacy—in line with coding for career choice in STEM contexts."
    }
  },
  {
    paper: {
      title: "Factors predicting STEM career interest: the mediating role of engagement and epistemic cognition in physics",
      abstract: "This study tested a conceptual model of factors contributing to students' interest in science, technology, engineering, and mathematics (STEM) careers. The interrelations among STEM career interest, engagement in physics classes, epistemic cognition in physics, gender, the socioeconomic status (SES), and physics grade of students were investigated. A sample of 8513 high school students participated in the study. Latent-variable structural equation modelling was employed. The results revealed that STEM career interest was significantly related to engagement, epistemic cognition, gender, and SES. However, the prediction pattern was non-uniform across the different STEM domains. Thus, disciplinary differences were observed in the factors that significantly predict students' interest in careers. Mediation analysis revealed that student engagement mediated the relation of epistemic cognition and gender to STEM career interest and physics grade. Epistemic cognition mediated the relationship between SES and STEM career interest. Significant gender and SES-related differences were also observed and are discussed herein."
    },
    coding: {
      include: 1,
      reason: [
        { group: "aspiration", clarification: "career" }
      ],
      subject: ["STEM", "physics"],
      design: 1,
      educationalLevel: [1],
      _confidence: 95,
      _reasoning: "Cross-sectional SEM analysis of high school students' STEM career interest, engagement, and cognition—fits the aspiration coding for STEM careers in a secondary education context."
    }
  },
  {
    paper: {
      title: "What we can learn from elite academic staff publication portfolios: a social network analysis",
      abstract: "Purpose The study aims to construct an understanding of professional academic writing network structures to inform organisational strategic investment in academic staff development. Design/methodology/approach Longitudinal social network analysis is used to examine the personal-networks evident in the publication portfolios of a purposive sample of four international academics across each quartile of the SCOPUS defined area of General Nursing's top 100 authors. Findings Trends in the publication portfolios of elite academics across gender, sector and geographic location are presented. In the first years of successful writing for publication, authors collaborate within a single highly connected co-author network. This network will typically expand to include new co-authors, before additional separate co-author collaborations emerge (three- to four- years). Authors experience steady growth in co-author numbers four- to seven- years from first co-authored publication. After a period of rapid expansion, these collaborations coalesce into a smaller number of highly connected groups (eight- to ten- years). Most collaborations occur within the higher education sector and across multiple disciplines including medicine, social sciences and psychology. Male co-authors are disproportionately represented in what is a predominantly female profession. Practical implications The development of extended co-author networks, locally, internationally and across the higher education sector, enable authors to attain the marker of achievement required by universities and government funding bodies, namely sustained output of academic publications. Identified trends support the inclusion of investment in academic time and resources in higher education institutions strategic and operational plans to enable academic staff to develop interdisciplinary professional networks. In focussing this investment on gender equality, female academics will experience parity of opportunity in achieving their organisational and personal goals relating to professional academic writing. Medium-term investment may be required before the impact of that investment becomes apparent. Originality/value This is the first example of social network analysis used to determine characteristics of professional academic writing portfolios over time. Findings inform the type and range of investment required to facilitate academic staff writing activities, specifically those publishing in the area of General Nursing."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Focuses on faculty publication networks and institutional investment, not on student career decision, retention, or STEM educational interventions."
    }
  },
  {
    paper: {
      title: "Association between personality traits and professional behavior with career adaptability in nursing and midwifery students",
      abstract: "BackgroundCareer adaptability enables individuals to navigate their career paths and address workplace challenges by gaining insight into themselves and their profession, empowering them to make informed decisions. This study was performed to reveal the association of nursing and midwifery students' personality traits and professional behavior with career adaptability. MethodThis cross-sectional study's sample consisted of nursing and midwifery students in the medical sciences of a state university in Tabriz (n = 210). The data were collected using the Student Information Questionnaire, Students Professional Behavior Questionnaire, Ten Item Personality Inventory, and Career Adapt-Abilities Scale. Descriptive tests and Pearson's correlation analysis were used for data analysis. Linear regression analysis was used to determine the variables that affect the career adaptability of students. ResultsThe mean (SD) points on the personality trait sub-dimensions of nursing and midwifery students were highest in agreeableness 8.95 (3.03) and lowest in extraversion 7.54 (2.30). The mean (SD) on the Scale of Student's Professional Behavior and Career Adapt-Abilities Scale were 114.88 (14.14) and 97.22 (15.59), respectively. The statistically significant association between the personality traits, Student's Professional Behavior, with career adaptability scores were weak and moderate, respectively. The 3 regression models used to determine the variables that affect the career adaptability of nursing students were significant. Of the variables in the models, professional behavior, extraversion, and how to choose a field (voluntary or non-voluntary) significantly influenced the total score on career adaptability. And the greatest impact was related to the professional behavior (beta = 0.373, P < 0.001). ConclusionThe results showed a direct correlation between personality traits with career adaptability. Also, high professional behavior and the voluntary choice of study field can be effective on career adaptability. The results suggest informing the students to choose the right field and planning and carrying out the necessary interventions to provide the proper education on professional behaviors. In addition, creating opportunities to improve personality traits can help the students' career adaptability."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Examines personality and professional behavior correlations with career adaptability in nursing/midwifery, not assessing choice or aspiration in STEM or degree decisions."
    }
  },
  {
    paper: {
      title: "A structural model of student experiences in a career-forward chemistry laboratory curriculum",
      abstract: "Persistence is a major issue facing students, particularly those who are both female and from underrepresented ethnic minorities (URM). A closer look at the variables affecting their commitment and capacity for continuing the pursuit of their goal allows us to better design support systems that bolster persistence. This study tests a structural equation model (SEM) for students using a career-forward laboratory chemistry curriculum based upon the Mediation Model of Research Experience (MMRE) that explains the relationships among self-efficacy, identity as an engineer, and commitment to an engineering career. Data were collected from 426 undergraduate engineering majors at the end of the semester using a previously constructed survey for three semesters of general chemistry laboratory for engineering majors. The research question was addressed using bivariate correlations and a series of SEMs where multigroup analyses were conducted separately for non-URM and URM participants. Bivariate correlations show significant positive associations between all four variables for the entire group of students. However, when disaggregated, the only significant association for URM participants (n = 109) was between identity as an engineer and commitment to an engineering career. Notably, teamwork self-efficacy was a negative predictor of commitment to an engineering career for URM participants. Beta-coefficients from the SEM show that identity and engineering self-efficacy are the variables most predictive of commitment, with identity being nearly twice as predictive for URM students. This study adds support for professional identity as a key predictive variable for career commitment for URM participants and indicates that a laboratory curriculum that emphasizes applied professional practice can support persistence. Considering the degree to which teamwork is emphasized generally, additional studies are needed to better understand the implications for URM students. Particularly in applications that emphasize long-term outcomes."
    },
    coding: {
      include: 1,
      reason: [
        { group: "retention" },
        { group: "choice", clarification: "career" }
      ],
      subject: ["chemistry", "engineering"],
      design: 1,
      educationalLevel: [2],
      _confidence: 94,
      _reasoning: "Undergraduate SEM study linking self-efficacy and identity to persistence/commitment in an engineering chemistry lab curriculum—fits 'retention' and career choice coding in STEM at tertiary level."
    }
  },
  {
    paper: {
      title: "On-Line Project-Based Learning on Healthcare Technologies Against Epidemic Diseases: A COVID-19 Case Study",
      abstract: "Quality technical education on healthcare technologies is still inaccessible to young adults in low-resource settings due to high costs, low-tech environments, and gaps in learning materials. The online and open-source collaborative Project-Based Learning (PBL) methodology intends to introduce early-career engineers into the development of healthcare technologies by allowing students from all around the world, regardless of background or place of origin, to engage in collaborative design methods, the use of open-source resources and learning experiences from experts in the field. This paper discusses a case study in which the aforementioned methodology was implemented, the COVID-19 Innovation Competition and Design Bootcamp 2020, which brought together 105 participants from 22 countries, mostly in Africa, to conceptualize the design of 10 medical devices in two weeks for an integral management of the COVID-19 pandemic that is applicable to other infectious disease outbreaks. The presented experience demonstrates that highly formative virtual PBL experiences can be carried out, in a cost-effective way and in connection with real societal needs, for which remarkable solutions can be found, by virtue of multidisciplinary and international cooperation. Our findings demonstrate that even if it is difficult to reach the degree of project completion achievable with longer-term and on-site design-build experiences, on-line PBL has been shown to promote students' professional skills in an effective way."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Describes PBL methodology and professional skill development in a global COVID-19 bootcamp, without measuring student career choices, aspirations, or STEM-specific enrollment outcomes."
    }
  },
  {
    paper: {
      title: "The Pittsburgh Transition: Not Quite So Simple",
      abstract: "Benjamin Armstrong's article compares state economic development policies in Pittsburgh and Cleveland in the 1980s, the period of major regional economic restructuring. Armstrong argues that what separated Pittsburgh from Cleveland in the ensuring years was the state-mandated inclusion of the city's universities as major economic development decision makers and the role that advanced technology played in Pittsburgh's recovery–much more prominent than in Cleveland's. The authors agree that the 1980s expanded stakeholders in the region's traditional economic development strategies, but not to the extent that Armstrong argues, and that significant other factors have affected the two regions in recent decades. The authors also find that the divergence in economic trends between the two regions is not as strong as Armstrong suggests."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Analysis of regional economic policy in the 1980s, not related to educational interventions, student career decision processes, or STEM education outcomes."
    }
  },
  {
    paper: {
      title: "Examining Doctoral Degree Attrition Rates: Using Expectancy-Value Theory to Compare Student Values and Faculty Supports",
      abstract: "US degree completion data show that historically underrepresented students and women are less likely to complete doctorate degrees, particularly in engineering. While there are many studies on persistence, few compare student and faculty perspectives especially in engineering. The purpose of this case study is to compare what experiences motivate doctoral students and what experiences faculty aim to provide based on what faculty believe motivates students, particularly for women and historically underrepresented students in the United States. Drawing on Eccles' Expectancy Value Theory, we answer the questions: What relationships exist between ability beliefs and subjective task values for underrepresented students persisting in earning a doctorate in engineering? How do student and faculty beliefs compare? Our findings show that while both students and faculty agree on ability beliefs to remain motivated, they showed differences in the value they assigned to doctoral experiences; students focus on attainment value and faculty on utility value. Our findings suggest that both advisors and students should prioritize clear communication in their needs and intentions to better support student motivation in the doctoral degree process. While the context of this study is in the US, practitioners can find parallels in our findings to other contexts and their respective underrepresented populations. Our findings have the indirect impact that supporting the motivation of underrepresented students in particular can contribute to increasing diversity in doctorate degree completion rates."
    },
    coding: {
      include: 1,
      reason: [
        { group: "retention" }
      ],
      subject: ["engineering"],
      design: 2,
      educationalLevel: [2],
      _confidence: 93,
      _reasoning: "Case study using Expectancy-Value Theory to compare factors influencing doctoral persistence among underrepresented groups in engineering—aligns with retention coding at the graduate level."
    }
  },
  {
    paper: {
      title: "Stability of Peer Acceptance and Rejection and Their Effect on Academic Performance in Primary Education: A Longitudinal Research",
      abstract: "The objectives of this study were to analyze the evolution of peer relationships and academic performance and the effect of the former on the latter in primary education, differentiating between positive and negative relationships. To this end, the likes and dislikes received by each student from his/her classmates were measured at four time points between first and sixth grades, as well as the marks given by their teachers in the subjects of mathematics and Spanish language. One-hundred-sixty-nine students (52.7% girls) from 10 classes of five public schools participated in this study. To verify the objectives, we used a complex structural equation model, obtained from a combination of two autoregressive models (AR, one for social preferences and another one for academic performance), two multi-trait multi-method models (MTMM, one for acceptances and rejections and another one for academic performance in mathematics and Spanish language), and an effects model of social preferences on academic performance. This study confirms: (a) The stability of both peer relationships and academic performance throughout childhood; (b) the stable influence of social relationships on academic performance; and (c) the importance of considering acceptance and rejection differentially. This work reveals the failure of the school to address initial disadvantages, and it provides guidelines for early and inclusive interventions."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Longitudinal analysis of peer relationships and academic performance in primary school; does not address student career decisions, STEM major choices, or postsecondary aspirations."
    }
  },
  {
    paper: {
      title: "Gender effects in education revisited: Gender roles, instrumental and expressive traits, and motivational factors for STEM high school course selection",
      abstract: "The present study investigates how gender role attitudes and instrumental and expressive traits can predict STEM course choices of male and female students in upper secondary education. Moreover, it is examined whether this relationship is mediated by mathematical self-concept, interest and anxiety. Using two waves of the BIJU dataset (N = 6,507), latent path models showed that gender role attitudes were not associated with the choice of a STEM course. For both genders, mediation effects of expressive and instrumental traits and STEM course choice emerged, mediated primarily by self-concept. Female and male students who described themselves as having more expressive traits exhibited lower self-concept and were less likely to choose a STEM course. When students described themselves with more instrumental traits, they were more likely to choose a STEM course - mediated by mathematical-motivational factors."
    },
    coding: {
      include: 1,
      reason: [
        { group: "choice", clarification: "course" }
      ],
      subject: ["STEM"],
      design: 1,
      educationalLevel: [1],
      _confidence: 95,
      _reasoning: "Upper‐secondary latent path modeling directly predicts STEM course choice based on psychological traits and self‐concept, fitting the course‐choice coding for STEM."
    }
  },
  {
    paper: {
      title: "International Students' Social Media Use: An Integrative Review of Research Over a Decade",
      abstract: "As advancements in technology rapidly progress and the enrollment of international students continues to increase concurrently, understanding the impact of social media on their experiences has become an area of significant academic interest in the recent decade. This integrative review employs a hybrid review approach, integrating bibliometric analysis with structured review, to provide a comprehensive overview and systematic synthesis of the literature on social media use among international students. One hundred twenty-one studies retrieved from the Web of Science database were analyzed to delineate the evolution of the field and identify the influential journals. The paper further proposes an integrative framework that thematically summarizes the phenomenon, aiming to highlight the potent components in students' transitions. This review offers insights into the evolving landscape of social media use among international students, identifying potential directions for future study and policymaking."
    },
    coding: {
      include: 0,
      _confidence: 92,
      _reasoning: "This is a literature review on social media use, not an empirical study of career choices, aspirations, or STEM educational outcomes."
    }
  },
  {
    paper: {
      title: "Making the case for workforce diversity in biomedical informatics to help achieve equity-centered care: a look at the AMIA First Look Program",
      abstract: "Developing a diverse informatics workforce broadens the research agenda and ensures the growth of innovative solutions that enable equity-centered care. The American Medical Informatics Association (AMIA) established the AMIA First Look Program in 2017 to address workforce disparities among women, including those from marginalized communities. The program exposes women to informatics, furnishes mentors, and provides career resources. In 4 years, the program has introduced 87 undergraduate women, 41% members of marginalized communities, to informatics. Participants from the 2019 and 2020 cohorts reported interest in pursuing a career in informatics increased from 57% to 86% after participation, and 86% of both years' attendees responded that they would recommend the program to others. A June 2021 LinkedIn profile review found 50% of participants working in computer science or informatics, 4% pursuing informatics graduate degrees, and 32% having completed informatics internships, suggesting AMIA First Look has the potential to increase informatics diversity."
    },
    coding: {
      include: 1,
      reason: [
        { group: "aspiration", clarification: "career" }
      ],
      subject: ["informatics"],
      design: 2,
      educationalLevel: [2],
      _confidence: 90,
      _reasoning: "Program evaluation with pre/post measures of career interest in informatics among undergraduates, matching career aspiration coding for tertiary level."
    }
  },
  {
    paper: {
      title: "An exploration of occupational choices in adolescence: A constructivist grounded theory study",
      abstract: "Background Adolescence is a critical period within the life course, for developing adult occupational competencies and health behaviours. Few studies have considered how 16-17 year olds choose activities and behaviours from an occupational perspective. Aim and objectives To explore how adolescents aged 16-17 years old make choices about their daily occupations to inform a theoretical model of occupational choice. Materials and methods About 27 secondary school students aged 16-17 years attended one of six focus groups. Transcripts were analyzed using constructivist grounded theory, informing the iterative development of a theoretical model of occupational choice. Results Adolescent occupational choice occurred in response to experiencing needs, and was characterized by 'weighing up' and 'juggling' the following four key domains: 'Appraising values and priorities', 'Interacting with the situational context', 'Exploring skills and occupational repertoire' and 'Considering time factors'. A developing sense of responsibility and autonomy for occupational choices was described, leading to the development of the future occupational self. Conclusions and significance A theory illuminating how adolescents make choices was developed. The theory aligns with existing developmental literature and provides unique insights, from an occupational science perspective, on the conscious process by which adolescents make, develop and adapt choices about the occupations they do considering contextual and individual opportunities and constraints."
    },
    coding: {
      include: 0,
      _confidence: 91,
      _reasoning: "Constructivist grounded theory on daily occupational decision‐making, not measuring STEM or career/degree choices."
    }
  },
  {
    paper: {
      title: "First-generation student pathways to persistence and degree attainment: The roles of deeper learning and self-regulated learning beliefs",
      abstract: "Approaches to fostering deeper learning in secondary education are increasing in popularity, yet little is known about the long-term effects of deeper learning attendance for underrepresented learners. This study examined the long-term associations among attendance at a deeper learning secondary school, self-regulated learning beliefs, content knowledge, and four-year postsecondary persistence and degree attainment. Based on a sample of students (N = 534) matched on demographic and academic characteristics, we also tested whether these associations varied for first-generation students. Results provided evidence of positive pathways to persistence and degree attainment primarily through self-efficacy and content knowledge for the matched sample, and revealed specific, facilitative effects for first-generation students. Deeper learning was positively linked to both persistence and degree attainment through reading content knowledge for first-generation students. Findings indicate specific mechanisms by which deeper learning strategies may promote positive secondary and postsecondary outcomes for first-generation students and highlight areas for further study."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Longitudinal matched‐sample study of deeper learning effects on first-generation persistence, not specific to STEM choices or career aspirations."
    }
  },
  {
    paper: {
      title: "Online Mentoring as an Extracurricular Measure to Encourage Talented Girls in STEM (Science, Technology, Engineering, and Mathematics): An Empirical Study of One-on-One Versus Group Mentoring",
      abstract: "Online mentoring provides an effective means of extracurricular gifted education for talented girls in science, technology, engineering, and mathematics (STEM). Comparative studies on the effectiveness of one-on-one versus group mentoring are lacking, however. The authors investigated this question in the context of a Germany-wide online mentoring program that employed both approaches. Study participants were girls enrolled in high-achiever-track secondary education in Germany (N = 347) who were mentored online by female academics in STEM for 6 months, in either one-on-one (N = 156) or group mentoring (N = 191). It was assumed that the specific many-to-many group-mentoring condition examined in our study would be more effective than the one-on-one mentoring condition with respect to (a) the proportion of STEM communication and (b) the extent of STEM-related networking, both of which are important predictors of successful mentoring. Furthermore, the authors (c) expected more growth in elective intentions for the group-mentoring participants and (d) assumed that participants' centrality in their respective STEM networks would predict this increase. The study presents empirical support for all four assumptions and thus suggests that the special form of group mentoring examined here may be a more successful measure of extracurricular gifted education for girls in STEM than one-on-one mentoring."
    },
    coding: {
      include: 1,
      reason: [
        { group: "trajectory" },
        { group: "aspiration", clarification: "career" }
      ],
      subject: ["STEM"],
      design: 1,
      educationalLevel: [1],
      _confidence: 95,
      _reasoning: "Comparative mentoring intervention with quantitative outcomes on elective intentions and networking among high-achieving girls in STEM, fitting trajectory and aspiration coding."
    }
  },
  {
    paper: {
      title: "Knowledge and Attitudes of Medical and Health Science Students in the United Arab Emirates toward Genomic Medicine and Pharmacogenomics: A Cross-Sectional Study",
      abstract: "Medical and health science students represent future health professionals, and their perceptions are essential to increasing awareness on genomic medicine and pharmacogenomics. Lack of education is one of the significant barriers that may affect health professional's ability to interpret and communicate pharmacogenomics information and results to their clients. Our aim was to assess medical and health science students' knowledge, attitudes and perception for a better genomic medicine and pharmacogenomics practice in the United Arab Emirates (UAE). A cross-sectional study was conducted using a validated questionnaire distributed electronically to students recruited using random and snowball sampling methods. A total of 510 students consented and completed the questionnaire between December 2018 and October 2019. The mean knowledge score (SD) for students was 5.4 (+/- 2.7). There were significant differences in the levels of knowledge by the year of study of bachelor's degree students, the completion status of training or education in pharmacogenomics (PGX) or pharmacogenetics and the completion of an internship or study abroad program (p-values < 0.05). The top two barriers that students identified in the implementation of genomic medicine and pharmacogenomics were lack of training or education (59.7%) and lack of clinical guidelines (58.7%). Concerns regarding confidentiality and discrimination were stated. The majority of medical and health science students had positive attitudes but only had a fair level of knowledge. Stakeholders in the UAE must strive to acquaint their students with up-to-date knowledge of genomic medicine and pharmacogenomics."
    },
    coding: {
      include: 0,
      _confidence: 90,
      _reasoning: "Cross-sectional survey of genomic medicine knowledge and attitudes, without measuring career choice or STEM course enrollment."
    }
  }
];



export async function categorizePaper(title: string, abstract: string): Promise<CodingResult> {
  const { model } = useModelSettingsStore.getState();
  const apiKey = useApiKeyStore.getState().apiKey;
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const input = [];
  for (const example of examples) {
    input.push({ role: "user", content: JSON.stringify(example.paper) });
    input.push({ role: "assistant", content: JSON.stringify(example.coding, null, 2) });
  }
  input.push({ role: "user", content: JSON.stringify({ title, abstract }) });

  const response = await openai.responses.parse({
    model,
    // @ts-ignore
    input,
    text: {
      format: zodTextFormat(CodingSchema, "codingResult")
    }
  });

  // Return parsed output or a default exclusion if parsing fails
  return response.output_parsed ? (response.output_parsed as CodingResult) : { include: 0, _reasoning: "Parsing failed" };
}
