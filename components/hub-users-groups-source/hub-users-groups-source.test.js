import HubUsersGroupsSource, {TOP_ALL} from './hub-users-groups-source';

describe('HubUsersGroupsSource', function () {
  const TOP = 20;

  beforeEach(function () {
    this.fakeAuth = {
      requestToken: this.sinon.stub().returns(Promise.resolve('testToken')),
      getApi: this.sinon.stub().returns(Promise.resolve({}))
    }
  });

  it('Should make request for users', function () {
    let source = new HubUsersGroupsSource(this.fakeAuth);
    return source.getUsers()
      .then(() => {
        this.fakeAuth.getApi.should.have.been.calledWith('users', 'testToken', {
          query: '',
          fields: 'id,name,login,profile/avatar/url',
          orderBy: 'name',
          $top: TOP
        });
      });
  });

  it('Should construct correct query for users', function () {
    let source = new HubUsersGroupsSource(this.fakeAuth);
    return source.getUsers('nam')
      .then(() => {
        this.fakeAuth.getApi.should.have.been.calledWith(sinon.match.string, sinon.match.string, {
          query: 'nameStartsWith: nam or loginStartsWith: nam',
          fields: sinon.match.string,
          orderBy: sinon.match.string,
          $top: sinon.match.number
        });
      });
  });

  it('Should not wrap name with braces if filter is one word', function () {
    let sameFilter = HubUsersGroupsSource.prepareFilter('oneword');
    sameFilter.should.equal('oneword');
  });

  it('Should wrap name with braces if filter has spaces', function () {
    let wrappedFilter = HubUsersGroupsSource.prepareFilter('two words');
    wrappedFilter.should.equal('{two words}');
  });

  it('Should make request for groups', function () {
    let source = new HubUsersGroupsSource(this.fakeAuth);
    return source.getGroups()
      .then(() => {
        this.fakeAuth.getApi.should.have.been.calledWith('usergroups', 'testToken', {
          fields: 'id,name,userCount',
          orderBy: 'name',
          $top: TOP_ALL
        });
      });
  });

  it('Should cache request for groups', function () {
    this.fakeAuth.getApi = this.sinon.stub().returns(Promise.resolve({}));

    let source = new HubUsersGroupsSource(this.fakeAuth);
    source.getGroups();
    source.getGroups();
    return source.getGroups()
      .then(() => {
        this.fakeAuth.getApi.should.have.been.called.once;
      });
  });

  it('Should clear cache after interval provided', function () {
    this.fakeAuth.getApi = this.sinon.stub().returns(Promise.resolve({}));
    let clock = this.sinon.useFakeTimers();
    let source = new HubUsersGroupsSource(this.fakeAuth, {cacheExpireTime: 1000});

    source.getGroups();
    clock.tick(2000);
    return source.getGroups()
      .then(() => {
        this.fakeAuth.getApi.should.have.been.called.twice;
      });

  });

  it('Should convert users to list model', function () {
    this.fakeAuth.getApi = this.sinon.stub();
    this.fakeAuth.getApi.onFirstCall().returns(Promise.resolve({users: [{
      id: 1,
      name: 'test user',
      login: 'testUser',
      profile: {avatar: {url: 'http://test.com.url'}}
    }]}));

    this.fakeAuth.getApi.onSecondCall().returns(Promise.resolve({}));

    let source = new HubUsersGroupsSource(this.fakeAuth);

    return source.getForList()
      .then((dataForList) => {
        dataForList.should.contain({
          id: 1,
          login: 'testUser',
          profile: {avatar: {url: 'http://test.com.url'}},
          name: 'test user',
          key: 1,
          label: 'test user',
          description: 'testUser',
          icon: 'http://test.com.url'
        });
      });
  });

  it('Should convert usergroups to list model', function () {
    this.fakeAuth.getApi = this.sinon.stub();
    this.fakeAuth.getApi.onFirstCall().returns(Promise.resolve({}));
    this.fakeAuth.getApi.onSecondCall().returns({usergroups: [{
      id: 1,
      name: 'test group',
      userCount: 123
    }]});

    let source = new HubUsersGroupsSource(this.fakeAuth);

    return source.getForList()
      .then((dataForList) => {
        dataForList.should.contain({
          id: 1,
          key: 1,
          name: 'test group',
          label: 'test group',
          description: '',
          userCount: 123
        });
      });
  });

  it('Should support userCount plural formatter', function () {
    this.fakeAuth.getApi = this.sinon.stub();
    this.fakeAuth.getApi.onFirstCall().returns(Promise.resolve({}));
    this.fakeAuth.getApi.onSecondCall().returns({usergroups: [{
      id: 1,
      name: 'test group',
      userCount: 123
    }]});

    let source = new HubUsersGroupsSource(this.fakeAuth, {
      getPluralForUserCount: (count) => `${count} text`
    });

    return source.getForList()
      .then((dataForList) => {
        dataForList[1].description.should.equal('123 text');
      });
  });
});