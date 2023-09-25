export interface IDownloadResponse {
  status: number;
  message: string;
}

export type IKnexConfig = {
  client: string;
  connection: {
    filename: string;
  };
  useNullAsDefault: boolean;
}

export interface ICustomerResponse {
  "Index": number;
  "Customer Id": string;
  "First Name": string;
  "Last Name": string;
  "Company": string;
  City: string;
  Country: string;
  "Phone 1": string;
  "Phone 2": string;
  Email: string;
  "Subscription Date": string;
  "Website": string;
}

export interface IOrganizationResponse {
  "Index": number;
  "Organization Id": string;
  Name: string;
  Website: string;
  Country: string;
  Description: string;
  Founded: string;
  Industry: string;
  "Number of employees": string;
}

export interface ICompaniesResponse {
  "Company Name": string;
  "YC URL": string;
}

export interface ICompanies {
  title: string;
  founded: string;
  teamSize: number;
  jobs: IJobs[];
  founders: IFounders[];
  launchPosts: ILaunchPosts[];
}

export interface ILaunchPosts {
  title: string;
}

export interface IFounders {
  name: string;
  linkedIn: string;
}

export interface IJobs {
  role: string;
  location: string;
}